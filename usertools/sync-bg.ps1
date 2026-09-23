# 场景三：换大图（背景图 / 开屏素材）。只传那张图，不构建，刷新页面即生效
# 用法：usertools\sync-bg.ps1 -File public/bg/新背景.jpg   （-File 路径相对于项目根目录）
# 注意图片文件名避免 ASCII 空格（scp 会按空格切分本地路径）
# 【编码】本文件必须保存为 UTF-8 with BOM——PowerShell 5.1 把无 BOM 的 UTF-8 当 ANSI 读
param([Parameter(Mandatory = $true)][string]$File)
$ErrorActionPreference = "Stop"
$Key = "C:\Users\<你的用户名>\.ssh\<你的密钥>.pem"
$Server = "root@<你的服务器IP>"
# 自动切到项目根目录（usertools 的上一级），-File 的相对路径以项目根目录为准
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path $File)) { throw "文件不存在：$File" }
scp -i $Key $File "${Server}:/var/www/blog/public/bg/"
if ($LASTEXITCODE -ne 0) { throw "上传失败" }
Write-Host "==> 完成。刷新页面即可看到新背景。"
