$ErrorActionPreference = "Stop"
$Archive = "blog-light.tar.gz"
if (Test-Path $Archive) { Remove-Item $Archive }
$files = @("app","components","lib","scripts","types","content","docs","public/md_images","public/friends","public/theme","package.json","package-lock.json","next.config.ts","tsconfig.json","next-env.d.ts",".gitignore","AGENTS.md","README.md",".env.example")
& tar -czf $Archive @files