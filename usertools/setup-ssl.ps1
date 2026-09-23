# setup-ssl.ps1 —— 换 SSL 证书（阿里云证书续期 / 换域名时用）
# 只做三件事：传新证书+私钥 -> 收紧权限 -> nginx -t && reload
# 不碰站点配置（配置在 setup-nginx.ps1 / nginx-blog.conf 里管）
# 用法：
#   usertools\setup-ssl.ps1                                    用默认路径的 pem/key
#   usertools\setup-ssl.ps1 -Cert D:\new.pem -KeyFile D:\new.key
# 【编码】本文件必须保存为 UTF-8 with BOM——PowerShell 5.1 把无 BOM 的 UTF-8 当 ANSI 读
param(
  [string]$Cert = "C:\Users\<你的用户名>\.ssh\blog.example.com.pem",
  [string]$KeyFile = "C:\Users\<你的用户名>\.ssh\blog.example.com.key"
)
$ErrorActionPreference = "Stop"
$Key = "C:\Users\<你的用户名>\.ssh\<你的密钥>.pem"
$Server = "root@<你的服务器IP>"
$CertName = "blog.example.com"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path $Cert))    { throw "找不到证书文件：$Cert" }
if (-not (Test-Path $KeyFile)) { throw "找不到私钥文件：$KeyFile" }

# 1. 先把旧证书备份一份（换坏了能立刻退回去）
Write-Host "==> 备份服务器上现有证书 ..."
$backup = "mkdir -p /etc/nginx/ssl/backup && cp -a /etc/nginx/ssl/${CertName}.fullchain.pem /etc/nginx/ssl/${CertName}.key /etc/nginx/ssl/backup/ 2>/dev/null; ls /etc/nginx/ssl/backup/ 2>/dev/null"
ssh -i $Key $Server $backup
if ($LASTEXITCODE -ne 0) { throw "备份失败（ssl 目录可能还没建，先跑 setup-nginx.ps1）" }

# 2. 上传新证书
Write-Host "==> 上传新证书 ..."
scp -i $Key $Cert "${Server}:/etc/nginx/ssl/${CertName}.fullchain.pem"
if ($LASTEXITCODE -ne 0) { throw "证书上传失败" }
scp -i $Key $KeyFile "${Server}:/etc/nginx/ssl/${CertName}.key"
if ($LASTEXITCODE -ne 0) { throw "私钥上传失败" }

# 3. 权限 + nginx -t + reload（-t 不过就不会 reload，线上继续用旧进程）
Write-Host "==> 设置权限并 reload nginx ..."
$remote = "chown root:root /etc/nginx/ssl/*.pem /etc/nginx/ssl/*.key && chmod 644 /etc/nginx/ssl/*.pem && chmod 600 /etc/nginx/ssl/*.key && nginx -t && systemctl reload nginx"
ssh -i $Key $Server $remote
if ($LASTEXITCODE -ne 0) { throw "nginx 校验/reload 失败——证书与私钥可能不配对，用 openssl 核对一下再重试" }

Write-Host "==> 完成。浏览器强刷（Ctrl+F5）确认新证书生效。"
Write-Host "    核对线上证书到期时间：" -ForegroundColor Cyan
ssh -i $Key $Server "echo | openssl s_client -connect 127.0.0.1:443 -servername blog.example.com 2>/dev/null | openssl x509 -noout -subject -dates"
