# LIFORA v2.10.3: user-invoked, verified official Community Plugin installer.
# Do not execute while Obsidian is running. Does not remove existing user data.
[CmdletBinding()]
param([string]$VaultPath = "")
$ErrorActionPreference = "Stop"
$specs = @(
  @{Id="obsidian-excalidraw-plugin"; Repo="zsviczian/obsidian-excalidraw-plugin"; Enable=$true},
  @{Id="advanced-canvas"; Repo="Developer-Mike/obsidian-advanced-canvas"; Enable=$true},
  @{Id="tasknotes"; Repo="callumalpass/tasknotes"; Enable=$true},
  @{Id="editing-toolbar"; Repo="PKM-er/obsidian-editing-toolbar"; Enable=$false}
)
if (-not $VaultPath) { $VaultPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path }
$VaultPath = (Resolve-Path -LiteralPath $VaultPath).Path
$obsidianDir = Join-Path $VaultPath ".obsidian"
if (-not (Test-Path (Join-Path $obsidianDir "plugins"))) { throw "Not a LIFORA Obsidian vault: $VaultPath" }
if (Get-Process -Name Obsidian -ErrorAction SilentlyContinue) {
  throw "Close Obsidian completely before installing plugins, then run setup again."
}
Write-Host "LIFORA Plugin Setup - $VaultPath" -ForegroundColor Cyan
Write-Host "Downloads official GitHub release files, verifies manifest IDs, preserves existing installations."
Write-Host "Editing Toolbar is installed DISABLED because LIFORA has its own toolbar."
Write-Host "Internet access is required."
$answer = Read-Host "Install or verify these 4 plugins from GitHub now? [Y/N]"
if ($answer -notmatch '^(y|yes)$') { Write-Host "No changes made."; exit 0 }
$pluginsPath = Join-Path $obsidianDir "plugins"
$enabled = @()
$enablePath = Join-Path $obsidianDir "community-plugins.json"
if (Test-Path -LiteralPath $enablePath) {
  $parsed = Get-Content -LiteralPath $enablePath -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($name in $parsed) { if ($name -is [string] -and $enabled -cnotcontains $name) { $enabled += $name } }
}
function Download-Official-Asset($asset, $path) {
  $uri = [string]$asset.browser_download_url
  if ($uri -notmatch '^https://github\.com/[^/]+/[^/]+/releases/download/') { throw "Unrecognized release asset host: $uri" }
  Invoke-WebRequest -Uri $uri -OutFile $path -UseBasicParsing -Headers @{"User-Agent"="LIFORA-PluginSetup/2.10.3"}
  if ((Get-Item -LiteralPath $path).Length -lt 10) { throw "Downloaded asset is unexpectedly empty." }
}
$installed = @()
foreach ($spec in $specs) {
  $id = $spec.Id; $repo = $spec.Repo
  $destination = Join-Path $pluginsPath $id
  $manifestPath = Join-Path $destination "manifest.json"
  $mainPath = Join-Path $destination "main.js"
  if ((Test-Path -LiteralPath $mainPath -PathType Leaf) -and (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    Write-Host "PRESENT: $id (existing installation preserved)" -ForegroundColor Green
    $installed += $spec
    continue
  }
  $stage = Join-Path ([System.IO.Path]::GetTempPath()) ("LIFORA-plugin-" + [Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $stage -Force | Out-Null
  try {
    Write-Host "Fetching $id from GitHub: $repo"
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" -Headers @{"User-Agent"="LIFORA-PluginSetup/2.10.3"; "Accept"="application/vnd.github+json"}
    $assets = @($release.assets)
    $got = @()
    foreach ($filename in @("manifest.json", "main.js", "styles.css")) {
      $asset = $assets | Where-Object { $_.name -ceq $filename } | Select-Object -First 1
      if ($null -ne $asset) {
        Download-Official-Asset $asset (Join-Path $stage $filename)
        $got += $filename
      }
    }
    if ($got -notcontains "main.js" -or $got -notcontains "manifest.json") {
      $zipasset = $assets | Where-Object { $_.name -match '\.zip$' } | Select-Object -First 1
      if ($null -eq $zipasset) { throw "Release does not provide verified main.js and manifest.json assets or a ZIP." }
      $bundle = Join-Path $stage "release.zip"
      Download-Official-Asset $zipasset $bundle
      $expand = Join-Path $stage "expanded"
      Expand-Archive -LiteralPath $bundle -DestinationPath $expand -Force
      foreach ($filename in @("manifest.json", "main.js", "styles.css")) {
        if (-not (Test-Path (Join-Path $stage $filename))) {
          $found = Get-ChildItem -LiteralPath $expand -Filter $filename -File -Recurse | Select-Object -First 1
          if ($null -ne $found) { Copy-Item -LiteralPath $found.FullName -Destination (Join-Path $stage $filename) }
        }
      }
    }
    if (-not (Test-Path (Join-Path $stage "main.js")) -or -not (Test-Path (Join-Path $stage "manifest.json"))) { throw "Plugin release files incomplete." }
    $manifest = Get-Content -LiteralPath (Join-Path $stage "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json
    if ([string]$manifest.id -cne $id) { throw "Manifest identity mismatch: expected $id; got $($manifest.id)." }
    if (-not $manifest.version -or -not $manifest.minAppVersion) { throw "Manifest is missing version or compatibility information." }
    if (Test-Path -LiteralPath $destination) {
      # Never overwrite user-installed versions or their settings.
      Write-Warning "Skipped incomplete pre-existing folder $destination. Please repair it manually."
      continue
    }
    New-Item -ItemType Directory -Path $destination | Out-Null
    foreach ($filename in @("manifest.json", "main.js", "styles.css")) {
      $src = Join-Path $stage $filename
      if (Test-Path -LiteralPath $src) { Copy-Item -LiteralPath $src -Destination (Join-Path $destination $filename) }
    }
    Write-Host "INSTALLED: $id version $($manifest.version)" -ForegroundColor Green
    $installed += $spec
  } catch {
    Write-Warning "Could not install $id. Existing data untouched. $($_.Exception.Message)"
  } finally {
    Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
  }
}
foreach ($spec in $installed) {
  if ($spec.Enable -and $enabled -cnotcontains $spec.Id) { $enabled += $spec.Id }
}
if (Test-Path -LiteralPath $enablePath) {
  Copy-Item -LiteralPath $enablePath -Destination "$enablePath.lifora-preinstall.bak" -Force
}
$json = ConvertTo-Json -InputObject @($enabled) -Depth 3
[System.IO.File]::WriteAllText($enablePath, $json + "`r`n", [System.Text.UTF8Encoding]::new($false))
Write-Host "Setup finished. Restart Obsidian and check Community Plugins. Installing does not guarantee a plugin supports your Obsidian version." -ForegroundColor Cyan
Write-Host "On Android, use Obsidian Community Plugins to install and enable them separately if the plugin files are not synced."
