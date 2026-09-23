# 场景五：单独改私有文章口令。
# 本地 .env.local 与服务器 /var/www/blog/.env.local 同时改成同一个新口令，并在服务器重新构建
# （旧密文会被新口令重加密；不重新构建的话线上还是旧口令能解）。
#
# 用法：
#   usertools\set-private-password.ps1                  交互输入（不回显，输两遍确认）
#   usertools\set-private-password.ps1 -Generate        自动生成一个强口令并打印出来
#   usertools\set-private-password.ps1 -Password 'xxx'  直接给口令（会留在命令历史里，慎用）
#   usertools\set-private-password.ps1 -NoBuild         只写两边的 .env.local，不在服务器构建
#   usertools\set-private-password.ps1 -LocalOnly       只改本地（服务器之后自己改，慎用：
#                                                       两边不一致时本地校验／本地加密构建会误导）
#
# 口令是怎么送过去的：本地把它 base64 成一个临时文件 scp 上去，远端的固定脚本再解回并写进
# .env.local，然后立刻删掉临时文件——**明文口令不出现在 ssh 命令行、也不进远端 shell 历史**。
#
# 【编码】本文件必须保存为 UTF-8 with BOM——PowerShell 5.1 把无 BOM 的 UTF-8 当 ANSI 读，中文注释会破坏解析
# 【注意】$apply 必须用单引号包住，防止 PowerShell 抢先展开远端的 $(...)
param(
  [string]$Password,
  [switch]$Generate,
  [switch]$NoBuild,
  [switch]$LocalOnly
)
$ErrorActionPreference = "Stop"
$Key = "C:\Users\<你的用户名>\.ssh\<你的密钥>.pem"
$Server = "root@<你的服务器IP>"
# 自动切到项目根目录（usertools 的上一级），从任意位置调用都可以
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not (Test-Path ".\package.json")) { throw "找不到 package.json，请确认 usertools 文件夹在项目根目录下" }

# ---------- 1. 取新口令 ----------
if ($Generate) {
  # 去掉容易看错的 0/O/1/I/l，长度 6+14 = 20
  $alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  $bytes = [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(14)
  $suffix = -join ($bytes | ForEach-Object { $alphabet[$_ % $alphabet.Length] })
  $Password = "HuTao-$suffix"
  Write-Host "==> 已生成新口令（请立刻记下来，脚本只显示这一次）：" -ForegroundColor Yellow
  Write-Host "    $Password" -ForegroundColor Yellow
} elseif (-not $Password) {
  $s1 = Read-Host "请输入新的私有文章口令" -AsSecureString
  $s2 = Read-Host "再输入一次确认" -AsSecureString
  $p1 = [System.Net.NetworkCredential]::new("", $s1).Password
  $p2 = [System.Net.NetworkCredential]::new("", $s2).Password
  if ($p1 -cne $p2) { throw "两次输入不一致，已取消" }
  $Password = $p1
}
if ([string]::IsNullOrWhiteSpace($Password)) { throw "口令不能为空" }
if ($Password -match "[\r\n]") { throw "口令不能包含换行" }

# ---------- 2. 写本地 .env.local（保留文件里的其它变量与注释） ----------
$envPath = Join-Path (Get-Location) ".env.local"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)  # .env 不能带 BOM，否则第一个键会读坏
$lines = @()
if (Test-Path $envPath) {
  $lines = @([System.IO.File]::ReadAllLines($envPath) | Where-Object { $_ -notmatch '^\s*PRIVATE_POST_PASSWORD\s*=' })
} else {
  $lines = @(
    "# 本地环境变量（不进 Git）：PRIVATE_POST_PASSWORD = 私有文章正文的加密口令",
    "# 由 usertools\set-private-password.ps1 维护；本地/服务器必须一致。"
  )
}
$body = (@($lines) + "PRIVATE_POST_PASSWORD=$Password") -join "`n"
[System.IO.File]::WriteAllText($envPath, $body + "`n", $utf8NoBom)
Write-Host ("==> 本地 .env.local 已更新（口令长度 {0}，不回显）" -f $Password.Length)

if ($LocalOnly) {
  Write-Host "==> 只改了本地（-LocalOnly）：服务器上还是旧口令。" -ForegroundColor Yellow
  Write-Host "    两边一致后记得本地重新构建：usertools\local-run.ps1 -Encrypt"
  exit 0
}

# ---------- 3. 服务器：口令走 base64 临时文件，命令行里不出现明文 ----------
$tmp = Join-Path $env:TEMP ("blog-private-pw-" + [guid]::NewGuid().ToString("N") + ".b64")
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Password))
[System.IO.File]::WriteAllText($tmp, $b64, $utf8NoBom)

Write-Host "==> 上传口令 ..."
scp -i $Key $tmp "${Server}:/tmp/blog-private-pw.b64"
if ($LASTEXITCODE -ne 0) { Remove-Item $tmp -Force; throw "上传失败" }
Remove-Item $tmp -Force

Write-Host "==> 服务器写入 .env.local ..."
# 固定脚本串：换成别的键都不动（grep -v 保留其它行），写完立刻删掉临时口令文件
$apply = 'cd /var/www/blog && touch .env.local && grep -v "^PRIVATE_POST_PASSWORD=" .env.local > /tmp/blog-env.tmp; printf "PRIVATE_POST_PASSWORD=%s\n" "$(base64 -d /tmp/blog-private-pw.b64)" >> /tmp/blog-env.tmp && mv /tmp/blog-env.tmp .env.local && chmod 600 .env.local && rm -f /tmp/blog-private-pw.b64'

if ($NoBuild) {
  Write-Host "==> 跳过服务器构建（-NoBuild）" -ForegroundColor Yellow
  ssh -i $Key $Server $apply
} else {
  Write-Host "==> 服务器重新构建并重启（用新口令重加密旧密文）..."
  ssh -i $Key $Server ($apply + ' && npm run build && pm2 restart blog')
}
if ($LASTEXITCODE -ne 0) { throw "服务器端执行失败" }

# ---------- 4. 收尾 ----------
Write-Host ""
Write-Host "==> 完成：本地与服务器的 PRIVATE_POST_PASSWORD 已同步。" -ForegroundColor Green
if ($NoBuild) {
  Write-Host "    ⚠ 服务器还没构建：线上仍是旧口令能解的密文，记得补跑一次 deploy-code.ps1" -ForegroundColor Yellow
} else {
  Write-Host "    线上已上线新口令，用新口令叩门即可。"
}
Write-Host "    本地要重新构建后才与新口令一致：usertools\local-run.ps1 -Encrypt"
Write-Host "    本地校验（先构建）：node scripts\verify-private-crypto.mjs"
