$ErrorActionPreference = "Stop"
$Archive = "blog-full.tar.gz"
if (Test-Path $Archive) { Remove-Item $Archive }
$files = @("app","components","lib","scripts","types","content","docs","public","package.json","package-lock.json","next.config.ts","tsconfig.json","next-env.d.ts",".gitignore","AGENTS.md","README.md")
& tar -czf $Archive @files