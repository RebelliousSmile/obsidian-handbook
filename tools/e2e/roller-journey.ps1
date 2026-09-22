param(
	[string]$ObsidianPath = "C:\Program Files\Obsidian\Obsidian.exe",
	[int]$Port = 9233,
	[string]$OutputDir = ""
)

$ErrorActionPreference = "Stop"
$vaultRoot = $null
$profileRoot = $null
$archivePath = $null
$process = $null

function Stop-ProcessTree {
	param([int]$ProcessId)
	Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" | ForEach-Object { Stop-ProcessTree -ProcessId $_.ProcessId }
	Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path -LiteralPath $ObsidianPath -PathType Leaf)) { throw "Obsidian was not found at $ObsidianPath." }

try {
	$repositoryRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
	$lock = Get-Content -LiteralPath (Join-Path $PSScriptRoot "fixtures\dice-roller.lock.json") -Raw | ConvertFrom-Json
	$vaultRoot = Join-Path ([IO.Path]::GetTempPath()) ("handbook-roller-" + [guid]::NewGuid())
	$profileRoot = Join-Path ([IO.Path]::GetTempPath()) ("handbook-roller-profile-" + [guid]::NewGuid())
	$outputRoot = if ($OutputDir) { $OutputDir } else { Join-Path ([IO.Path]::GetTempPath()) ("handbook-roller-output-" + [guid]::NewGuid()) }
	$handbookRoot = Join-Path $vaultRoot ".obsidian\plugins\obsidian-handbook"
	$diceRoot = Join-Path $vaultRoot ".obsidian\plugins\$($lock.id)"
	$archivePath = Join-Path ([IO.Path]::GetTempPath()) ("$($lock.id)-$($lock.version)-" + [guid]::NewGuid() + ".zip")
	New-Item -ItemType Directory -Path $handbookRoot, $diceRoot, $profileRoot, $outputRoot -Force | Out-Null
	Invoke-WebRequest -Uri $lock.archiveUrl -OutFile $archivePath
	if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash -ne $lock.sha256) { throw "Dice Roller archive hash did not match the fixture lock." }
	Expand-Archive -LiteralPath $archivePath -DestinationPath $diceRoot -Force
	$nestedMain = Get-ChildItem -LiteralPath $diceRoot -Filter "main.js" -File -Recurse | Select-Object -First 1
	if ($nestedMain -and $nestedMain.Directory.FullName -ne (Get-Item -LiteralPath $diceRoot).FullName) {
		$nestedRoot = $nestedMain.Directory.FullName
		Get-ChildItem -LiteralPath $nestedRoot -Force | Move-Item -Destination $diceRoot
		Remove-Item -LiteralPath $nestedRoot -Recurse -Force
	}
	if (-not (Test-Path -LiteralPath (Join-Path $diceRoot "main.js")) -or -not (Test-Path -LiteralPath (Join-Path $diceRoot "manifest.json"))) { throw "Dice Roller archive did not contain a plugin root." }
	Copy-Item -LiteralPath (Join-Path $repositoryRoot "dist\main.js") -Destination $handbookRoot
	Copy-Item -LiteralPath (Join-Path $repositoryRoot "dist\manifest.json") -Destination $handbookRoot
	Copy-Item -LiteralPath (Join-Path $repositoryRoot "dist\styles.css") -Destination $handbookRoot
	Copy-Item -LiteralPath (Join-Path $PSScriptRoot "fixtures\roller.md") -Destination (Join-Path $vaultRoot "roller.md")
	Set-Content -LiteralPath (Join-Path $vaultRoot ".obsidian\community-plugins.json") -Value '["obsidian-handbook","obsidian-dice-roller"]'
	Set-Content -LiteralPath (Join-Path $handbookRoot "data.json") -Value '{"features":{"roller":true}}'
	$registry = @{ vaults = @{ "1234567890abcdef" = @{ path = $vaultRoot; ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); open = $true } } }
	Set-Content -LiteralPath (Join-Path $profileRoot "obsidian.json") -Value ($registry | ConvertTo-Json -Depth 4 -Compress)
	$probeUri = "obsidian://open?path=$([uri]::EscapeDataString((Join-Path $vaultRoot 'roller.md')))"
	$arguments = @("--user-data-dir=`"$profileRoot`"", "--remote-debugging-port=$Port", "--remote-allow-origins=*", $probeUri)
	$process = Start-Process -FilePath $ObsidianPath -ArgumentList $arguments -WindowStyle Hidden -PassThru
	& python (Join-Path $PSScriptRoot "roller-cdp.py") $Port $outputRoot $vaultRoot
	if ($LASTEXITCODE -ne 0) { throw "The Roller CDP assertions failed." }
	Write-Output "Roller E2E report: $outputRoot"
} finally {
	if ($process -and -not $process.HasExited) { Stop-ProcessTree -ProcessId $process.Id }
	if ($archivePath -and (Test-Path -LiteralPath $archivePath)) { Remove-Item -LiteralPath $archivePath -Force -ErrorAction SilentlyContinue }
	if ($profileRoot -and (Test-Path -LiteralPath $profileRoot)) { Remove-Item -LiteralPath $profileRoot -Recurse -Force -ErrorAction SilentlyContinue }
	if ($vaultRoot -and (Test-Path -LiteralPath $vaultRoot)) { Remove-Item -LiteralPath $vaultRoot -Recurse -Force -ErrorAction SilentlyContinue }
}
