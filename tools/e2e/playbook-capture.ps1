param(
	[ValidateSet("monsterhearts", "urban-shadows", "all")]
	[string]$Game = "all",
	[string]$SchemaRoot = "",
	[string]$OutputDir = "",
	[string]$ObsidianPath = "C:\Program Files\Obsidian\Obsidian.exe",
	[int]$Port = 9241
)

# Captures a Monsterhearts (La Selkie) or Urban Shadows (The Aware) playbook block
# as Handbook renders it with the schema-pbta packs of a local checkout, so the
# render can be compared with the reference of the shared-playbook-styles plan.
# Everything lives in a temporary vault and an isolated Obsidian profile: the
# user's vaults, their data.json and their vault list are never touched.

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not $SchemaRoot) { $SchemaRoot = Join-Path (Split-Path $repositoryRoot -Parent) "schema-pbta" }
if (-not $OutputDir) { $OutputDir = Join-Path ([System.IO.Path]::GetTempPath()) "handbook-playbook-capture" }
if (-not (Test-Path -LiteralPath $ObsidianPath -PathType Leaf)) { throw "Obsidian was not found at $ObsidianPath." }
if (-not (Test-Path -LiteralPath (Join-Path $SchemaRoot "handbook.json") -PathType Leaf)) { throw "No schema-pbta checkout at $SchemaRoot (handbook.json is missing)." }
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$examples = @{
	"monsterhearts" = "examples\monsterhearts\monsterhearts-playbook\la-selkie.toml"
	"urban-shadows" = "examples\urban-shadows\urban-shadows-playbook\the-aware.toml"
}
$games = if ($Game -eq "all") { @("monsterhearts", "urban-shadows") } else { @($Game) }

function Stop-ProcessTree {
	param([int]$ProcessId)
	foreach ($child in Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId") { Stop-ProcessTree -ProcessId $child.ProcessId }
	Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Install-Source {
	# Lays the checkout out as Handbook's installer does: handbook.json, one
	# packs/<id>/ folder holding pack.json and assets/, and source.json.
	param([string]$VaultRoot)
	$sourceId = "rebellioussmile--schema-pbta"
	$sourceRoot = Join-Path $VaultRoot ".obsidian\handbook\sources\$sourceId"
	New-Item -ItemType Directory -Path (Join-Path $sourceRoot "packs") -Force | Out-Null
	Copy-Item -LiteralPath (Join-Path $SchemaRoot "handbook.json") -Destination $sourceRoot
	foreach ($pack in Get-ChildItem -LiteralPath (Join-Path $SchemaRoot "handbook") -Directory) {
		if (-not (Test-Path -LiteralPath (Join-Path $pack.FullName "pack.json"))) { continue }
		$target = Join-Path $sourceRoot "packs\$($pack.Name)"
		New-Item -ItemType Directory -Path $target -Force | Out-Null
		Copy-Item -LiteralPath (Join-Path $pack.FullName "pack.json") -Destination $target
		$assets = Join-Path $pack.FullName "assets"
		if (Test-Path -LiteralPath $assets) { Copy-Item -LiteralPath $assets -Destination $target -Recurse }
	}
	$revision = (& git -C $SchemaRoot rev-parse HEAD).Trim()
	$source = [ordered]@{ id = $sourceId; repository = "RebelliousSmile/schema-pbta"; reference = @{ kind = "branch"; value = "main" }; revision = $revision; checkedAt = [DateTimeOffset]::UtcNow.ToString("o") }
	Set-Content -LiteralPath (Join-Path $sourceRoot "source.json") -Value ($source | ConvertTo-Json -Compress)
}

foreach ($id in $games) {
	$vaultRoot = $null
	$profileRoot = $null
	$process = $null
	try {
		$vaultRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("handbook-playbook-capture-" + [guid]::NewGuid())
		$pluginRoot = Join-Path $vaultRoot ".obsidian\plugins\obsidian-handbook"
		New-Item -ItemType Directory -Path $pluginRoot -Force | Out-Null
		foreach ($file in "main.js", "manifest.json", "styles.css") { Copy-Item -LiteralPath (Join-Path $repositoryRoot "dist\$file") -Destination $pluginRoot }
		Install-Source -VaultRoot $vaultRoot
		# The data.json of the temporary vault only.
		Set-Content -LiteralPath (Join-Path $pluginRoot "data.json") -Value ('{"mode":"' + $id + '"}')
		Set-Content -LiteralPath (Join-Path $vaultRoot ".obsidian\community-plugins.json") -Value '["obsidian-handbook"]'
		Set-Content -LiteralPath (Join-Path $vaultRoot ".obsidian\app.json") -Value '{"defaultViewMode":"preview","readableLineLength":false}'
		$probePath = Join-Path $vaultRoot "playbook-probe.md"
		$fence = '```'
		$body = $fence + "pbta-playbook`n" + (Get-Content -LiteralPath (Join-Path $SchemaRoot $examples[$id]) -Raw) + "`n" + $fence + "`n"
		Set-Content -LiteralPath $probePath -Value $body -Encoding utf8

		$profileRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("handbook-playbook-profile-" + [guid]::NewGuid())
		New-Item -ItemType Directory -Path $profileRoot -Force | Out-Null
		# Without the auto-updated app bundle an isolated profile falls back to the installer version.
		$bundle = Get-ChildItem -LiteralPath (Join-Path $env:APPDATA "obsidian") -Filter "obsidian-*.asar" -ErrorAction SilentlyContinue |
			Sort-Object { [version]($_.BaseName -replace "^obsidian-", "") } -Descending | Select-Object -First 1
		if ($bundle) { Copy-Item -LiteralPath $bundle.FullName -Destination $profileRoot }
		$registry = @{ vaults = @{ "1234567890abcdef" = @{ path = $vaultRoot; ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); open = $true } } }
		Set-Content -LiteralPath (Join-Path $profileRoot "obsidian.json") -Value ($registry | ConvertTo-Json -Depth 4 -Compress)
		$probeUri = "obsidian://open?path=$([uri]::EscapeDataString($probePath))"
		$arguments = @("--user-data-dir=`"$profileRoot`"", "--remote-debugging-port=$Port", "--remote-allow-origins=*", $probeUri)
		$process = Start-Process -FilePath $ObsidianPath -ArgumentList $arguments -WindowStyle Normal -PassThru
		& python (Join-Path $PSScriptRoot "playbook-capture-cdp.py") $Port $OutputDir $vaultRoot $id
		if ($LASTEXITCODE -ne 0) { throw "The $id playbook capture failed." }
	} finally {
		if ($process -and -not $process.HasExited) { Stop-ProcessTree -ProcessId $process.Id }
		Start-Sleep -Seconds 2
		if ($profileRoot -and (Test-Path -LiteralPath $profileRoot)) { Remove-Item -LiteralPath $profileRoot -Recurse -Force -ErrorAction SilentlyContinue }
		if ($vaultRoot -and (Test-Path -LiteralPath $vaultRoot)) { Remove-Item -LiteralPath $vaultRoot -Recurse -Force -ErrorAction SilentlyContinue }
	}
}
Write-Output "Captures written to $OutputDir"
