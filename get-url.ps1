$logs = Get-ChildItem (Join-Path $env:TEMP 'cf-tunnel*.log') -ErrorAction SilentlyContinue
if (-not $logs) { exit }
$m = Select-String -Path $logs.FullName -Pattern 'https://[a-z-]+\.trycloudflare\.com'
if ($m) { ($m | Select-Object -Last 1).Matches[0].Value }