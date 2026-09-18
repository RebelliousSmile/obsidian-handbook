param(
	[string]$ObsidianPath = "C:\Program Files\Obsidian\Obsidian.exe",
	[int]$Port = 9232,
	[string]$OutputDir = "",
	[switch]$PrintOnly
)

$ErrorActionPreference = "Stop"
if ($PrintOnly) { $env:HANDBOOK_E2E_PRINT_ONLY = "1" }
$vaultRoot = $null
$profileRoot = $null
$process = $null

function Stop-ProcessTree {
	param([int]$ProcessId)

	$children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId"
	foreach ($child in $children) {
		Stop-ProcessTree -ProcessId $child.ProcessId
	}
	Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path -LiteralPath $ObsidianPath -PathType Leaf)) {
	throw "Obsidian was not found at $ObsidianPath."
}

try {
	$repositoryRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
	$vaultRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("handbook-layout-regions-" + [guid]::NewGuid())
	$pluginRoot = Join-Path $vaultRoot ".obsidian\plugins\obsidian-handbook"
	$outputRoot = if ($OutputDir) { $OutputDir } else { Join-Path $vaultRoot "e2e-output" }
	$probePath = Join-Path $vaultRoot "layout-regions-probe.md"
	New-Item -ItemType Directory -Path $pluginRoot, $outputRoot -Force | Out-Null

	Copy-Item -LiteralPath (Join-Path $repositoryRoot "dist\main.js") -Destination $pluginRoot
	Copy-Item -LiteralPath (Join-Path $repositoryRoot "dist\manifest.json") -Destination $pluginRoot
	Copy-Item -LiteralPath (Join-Path $repositoryRoot "dist\styles.css") -Destination $pluginRoot
	Set-Content -LiteralPath (Join-Path $vaultRoot ".obsidian\community-plugins.json") -Value '["obsidian-handbook"]'
	Copy-Item -LiteralPath (Join-Path $PSScriptRoot "fixtures\layout-regions-probe.md") -Destination $probePath
	Copy-Item -LiteralPath (Join-Path $PSScriptRoot "fixtures\layout-regions-print-probe.md") -Destination (Join-Path $vaultRoot "layout-regions-print-probe.md")

	# An isolated user-data-dir registers the temporary vault, so `obsidian://open`
	# finds it and the user's own Obsidian (and its vault list) stays untouched.
	$profileRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("handbook-layout-profile-" + [guid]::NewGuid())
	New-Item -ItemType Directory -Path $profileRoot -Force | Out-Null
	# Obsidian keeps its auto-updated app bundle in the user-data-dir; without it an
	# isolated profile falls back to the older installer version.
	$bundle = Get-ChildItem -LiteralPath (Join-Path $env:APPDATA "obsidian") -Filter "obsidian-*.asar" -ErrorAction SilentlyContinue |
		Sort-Object { [version]($_.BaseName -replace "^obsidian-", "") } -Descending | Select-Object -First 1
	if ($bundle) {
		Copy-Item -LiteralPath $bundle.FullName -Destination $profileRoot
	}
	$registry = @{ vaults = @{ "1234567890abcdef" = @{ path = $vaultRoot; ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); open = $true } } }
	Set-Content -LiteralPath (Join-Path $profileRoot "obsidian.json") -Value ($registry | ConvertTo-Json -Depth 4 -Compress)
	$probeUri = "obsidian://open?path=$([uri]::EscapeDataString($probePath))"
	$arguments = @("--user-data-dir=`"$profileRoot`"", "--remote-debugging-port=$Port", "--remote-allow-origins=*", $probeUri)
	$process = Start-Process -FilePath $ObsidianPath -ArgumentList $arguments -WindowStyle Normal -PassThru
	& python (Join-Path $PSScriptRoot "layout-regions-cdp.py") $Port $outputRoot $vaultRoot
	if ($LASTEXITCODE -ne 0) {
		throw "The layout-region CDP assertions failed."
	}
} finally {
	if ($process -and -not $process.HasExited) {
		Stop-ProcessTree -ProcessId $process.Id
	}
	if ($profileRoot -and (Test-Path -LiteralPath $profileRoot)) {
		Start-Sleep -Seconds 2
		Remove-Item -LiteralPath $profileRoot -Recurse -Force -ErrorAction SilentlyContinue
	}
	if ($vaultRoot -and (Test-Path -LiteralPath $vaultRoot)) {
		Remove-Item -LiteralPath $vaultRoot -Recurse -Force
	}
}
