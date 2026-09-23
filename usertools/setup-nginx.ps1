# Nginx 一次性配置（HTTPS 版）。可安全重跑：部署证书 -> 用 nginx-blog.conf 覆盖服务器配置 -> 重新链接 -> reload
# 证书来源：阿里云 SSL 下载的 pem/key（默认 C:\Users\<你的用户名>\.ssh\），可用 -Cert / -KeyFile 指定别的路径
#   -Cert 一般是 "xxx.pem"，里面自带「站点证书 + 中间证书」，直接当 fullchain 用
# 配置内容单独放在同目录 nginx-blog.conf（含中文注释，不能内联进 ps1，见顶部编码注意事项），
# nginx -t 不通过就不会 reload
# 【编码】本文件必须保存为 UTF-8 with BOM——PowerShell 5.1 把无 BOM 的 UTF-8 当 ANSI 读
param(
  [string]$Cert = "C:\Users\<你的用户名>\.ssh\blog.example.com.pem",
  [string]$KeyFile = "C:\Users\<你的用户名>\.ssh\blog.example.com.key",
  [switch]$SkipCert
)
$ErrorActionPreference = "Stop"
$Key = "C:\Users\<你的用户名>\.ssh\<你的密钥>.pem"
$Server = "root@<你的服务器IP>"
$CertName = "blog.example.com"
# 自动切到项目根目录（usertools 的上一级），从任意位置调用都可以
Set-Location (Split-Path $PSScriptRoot -Parent)
$Conf = Join-Path $PSScriptRoot "nginx-blog.conf"
if (-not (Test-Path $Conf)) { throw "找不到 nginx-blog.conf，请确认 usertools 文件夹完整" }

# 1. 部署证书（默认做；证书已在服务器上且没换证时可用 -SkipCert 跳过）
if (-not $SkipCert) {
  if (-not (Test-Path $Cert))    { throw "找不到证书文件：$Cert" }
  if (-not (Test-Path $KeyFile)) { throw "找不到私钥文件：$KeyFile" }

  Write-Host "==> 建 /etc/nginx/ssl 并上传证书 ..."
  ssh -i $Key $Server "mkdir -p /etc/nginx/ssl"
  if ($LASTEXITCODE -ne 0) { throw "无法在服务器建 ssl 目录" }

  scp -i $Key $Cert "${Server}:/etc/nginx/ssl/${CertName}.fullchain.pem"
  if ($LASTEXITCODE -ne 0) { throw "证书上传失败" }
  scp -i $Key $KeyFile "${Server}:/etc/nginx/ssl/${CertName}.key"
  if ($LASTEXITCODE -ne 0) { throw "私钥上传失败" }

  Write-Host "==> 收紧权限（私钥 600，证书 644）..."
  $chmod = "chown root:root /etc/nginx/ssl/* && chmod 644 /etc/nginx/ssl/*.pem && chmod 600 /etc/nginx/ssl/*.key && ls -l /etc/nginx/ssl"
  ssh -i $Key $Server $chmod
  if ($LASTEXITCODE -ne 0) { throw "权限设置失败" }
} else {
  Write-Host "==> -SkipCert：跳过证书上传，沿用服务器 /etc/nginx/ssl 里已有的证书"
}

# 2. 上传站点配置（80 跳 443 + 443 正式入口）
Write-Host "==> 上传 Nginx 配置 ..."
scp -i $Key $Conf "${Server}:/etc/nginx/sites-available/blog"
if ($LASTEXITCODE -ne 0) { throw "上传失败" }

Write-Host "==> 启用站点并 reload nginx ..."
# 单引号：整串在远端 shell 展开
$remote = 'ln -sf /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/blog && rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl reload nginx'
ssh -i $Key $Server $remote
if ($LASTEXITCODE -ne 0) { throw "nginx 校验/reload 失败" }
Write-Host "==> 完成。访问 https://blog.example.com 验证（首次需确认阿里云安全组已放行 443）。"
