# deploy-pack.ps1 - 打包博客项目用于服务器部署
# 用法：.\deploy-pack.ps1
#
# 如果新增了需要部署的文件/目录，在下方 tar 命令的文件列表中添加即可。
# 注意：public/bg/ 和 public/hutao/ 需要单独上传（文件较大）。

$ErrorActionPreference = "Stop"
$Archive = "blog.tar.gz"

# 清理旧包
if (Test-Path $Archive) { Remove-Item $Archive }

# 打包（修改下面这行来添加/删除文件）
& tar -czf $Archive `
    app components lib scripts types `
    content docs `
    public\files public\friends `
    package.json package-lock.json `
    next.config.ts tsconfig.json next-env.d.ts `
    .gitignore AGENTS.md README.md

if ($LASTEXITCODE -ne 0) { throw "打包失败" }

$size = [math]::Round((Get-Item $Archive).Length / 1KB, 1)
Write-Host "完成: $Archive ($size KB)" -ForegroundColor Green
