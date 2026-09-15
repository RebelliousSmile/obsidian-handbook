param(
	[string]$ObsidianPath = "C:\Program Files\Obsidian\Obsidian.exe",
	[int]$Port = 9232
)

$ErrorActionPreference = "Stop"
$vaultRoot = $null
$process = $null

function Stop-ProcessTree {
	param([int]$ProcessId)

	$children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId"
	foreach ($child in $children) {
		Stop-ProcessTree -ProcessId $child.ProcessId
	}
	Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

if (Get-Process Obsidian -ErrorAction SilentlyContinue) {
	throw "Close Obsidian before running this isolated journey."
}

if (-not (Test-Path -LiteralPath $ObsidianPath -PathType Leaf)) {
	throw "Obsidian was not found at $ObsidianPath."
}

try {
	$repositoryRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
	$vaultRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("handbook-layout-regions-" + [guid]::NewGuid())
	$pluginRoot = Join-Path $vaultRoot ".obsidian\plugins\obsidian-handbook"
	$outputRoot = Join-Path $vaultRoot "e2e-output"
	$probePath = Join-Path $vaultRoot "layout-regions-probe.md"
	New-Item -ItemType Directory -Path $pluginRoot, $outputRoot -Force | Out-Null

	Copy-Item -LiteralPath (Join-Path $repositoryRoot "dist\main.js") -Destination $pluginRoot
	Copy-Item -LiteralPath (Join-Path $repositoryRoot "dist\manifest.json") -Destination $pluginRoot
	Copy-Item -LiteralPath (Join-Path $repositoryRoot "dist\styles.css") -Destination $pluginRoot
	Set-Content -LiteralPath (Join-Path $vaultRoot ".obsidian\community-plugins.json") -Value '["obsidian-handbook"]'
	Set-Content -LiteralPath $probePath -Value @'
# Layout regions probe

<!-- handbook-layout: columns=3 -->

## One

First section.

## Two

Second section.

## Three

Third section.

<!-- /handbook-layout -->

<!-- handbook-layout: columns=1 -->

| Wide | Table |
| --- | --- |
| One | Two |

<!-- /handbook-layout -->

## Outside

This heading stays outside every region.
'@

	$arguments = "--remote-debugging-port=$Port --remote-allow-origins=*"
	$process = Start-Process -FilePath $ObsidianPath -ArgumentList $arguments -WindowStyle Hidden -PassThru
	Start-Sleep -Seconds 2
	$probeUri = "obsidian://open?path=$([uri]::EscapeDataString($probePath))"
	Start-Process -FilePath $probeUri
	& python (Join-Path $PSScriptRoot "layout-regions-cdp.py") $Port $outputRoot $vaultRoot
} finally {
	if ($process -and -not $process.HasExited) {
		Stop-ProcessTree -ProcessId $process.Id
	}
	if ($vaultRoot -and (Test-Path -LiteralPath $vaultRoot)) {
		Remove-Item -LiteralPath $vaultRoot -Recurse -Force
	}
}
