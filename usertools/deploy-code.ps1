# 场景二：代码更新（app / components / lib / scripts / types / package.json ...）
# 流程：打 light 包（deploy-light.ps1）→ 上传 → 服务器精准删除旧代码目录（保留 public/bg，light 包里没有它）
#       → 解包覆盖 → npm install → 构建 → pm2 重启。一条命令替代原来 ssh 上去手动敲的整段命令
# 【编码】本文件必须保存为 UTF-8 with BOM；$remote 用单引号包住，防止 PowerShell 抢先展开 $()
$ErrorActionPreference = "Stop"
$Key = "C:\Users\<你的用户名>\.ssh\<你的密钥>.pem"
$Server = "root@<你的服务器IP>"
# 自动切到项目根目录（usertools 的上一级），从任意位置调用都可以
Set-Location (Split-Path $PSScriptRoot -Parent)
$PackScript = Join-Path $PSScriptRoot "deploy-light.ps1"
if (-not (Test-Path $PackScript)) { throw "找不到 deploy-light.ps1，请确认 usertools 文件夹完整" }

Write-Host "==> 打 light 包（deploy-light.ps1）..."
& $PackScript
if ($LASTEXITCODE -ne 0) { throw "打包失败" }

Write-Host ("==> 上传 {0} MB ..." -f [math]::Round((Get-Item "blog-light.tar.gz").Length / 1MB, 1))
scp -i $Key "blog-light.tar.gz" "${Server}:/var/www/"
if ($LASTEXITCODE -ne 0) { throw "上传失败" }

Write-Host "==> 服务器更新代码（精准删除 -> 解包 -> 安装 -> 构建 -> 重启）..."
# 单引号：整串必须作为一个参数原样到达远端 shell，PowerShell 不做任何展开
$remote = 'cd /var/www && rm -rf blog/app blog/components blog/lib blog/scripts blog/types blog/content blog/docs blog/public/md_images blog/public/friends blog/.next && tar -xzf blog-light.tar.gz -C blog --overwrite && rm -f blog-light.tar.gz && cd blog && npm install && npm run build && pm2 restart blog'
ssh -i $Key $Server $remote
if ($LASTEXITCODE -ne 0) { throw "服务器端执行失败" }
Write-Host "==> 完成。"
