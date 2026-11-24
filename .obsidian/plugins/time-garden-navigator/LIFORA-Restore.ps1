# LIFORA Full Recovery — requires Windows PowerShell 5.1+, run AFTER closing Obsidian.
# Restore plan is produced by Backup Center; all backup contents checked before replacement.
param([Parameter(Mandatory=$true)][string]$PlanPath)
$ErrorActionPreference = 'Stop'
function Fail([string]$Message) { throw $Message }
function SafePath([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return $false }
  if ([IO.Path]::IsPathRooted($Value) -eq $false) { return $false }
  return $true
}
$stage = $null
$previous = $null
$previousMoved = $false
$stageMoved = $false
try {
  Write-Host 'LIFORA - Full Vault Restore' -ForegroundColor Cyan
  if (Get-Process -Name 'Obsidian' -ErrorAction SilentlyContinue) {
    Fail 'Close ALL Obsidian windows first, then rerun this file.'
  }
  if (Get-Process -Name 'syncthing','syncthingtray' -ErrorAction SilentlyContinue) {
    Fail 'Pause Syncthing on the computer before restoring; rerun afterward.'
  }
  $plan = Get-Content -LiteralPath $PlanPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($plan.planVersion -ne 1 -or !(SafePath $plan.vaultPath) -or !(SafePath $plan.backupRoot) -or
      $plan.backupId -notmatch '^LIFORA-FULL-[0-9TZ-]+-[0-9a-f]{8}$') { Fail 'Invalid restore plan.' }
  $vault = [IO.Path]::GetFullPath($plan.vaultPath).TrimEnd('\')
  $backupRoot = [IO.Path]::GetFullPath($plan.backupRoot).TrimEnd('\')
  $vaultPrefix = $vault + '\'
  if ($backupRoot -eq $vault -or $backupRoot.StartsWith($vaultPrefix,[StringComparison]::OrdinalIgnoreCase)) {
    Fail 'Backup root cannot be inside Vault.'
  }
  if ([IO.Path]::GetPathRoot($vault).TrimEnd('\') -eq $vault) { Fail 'Unsafe Vault root path.' }
  $backup = Join-Path $backupRoot $plan.backupId
  $manifestFile = Join-Path $backup 'manifest.json'
  $content = Join-Path $backup 'content'
  if (!(Test-Path -LiteralPath $manifestFile -PathType Leaf)) { Fail 'Missing backup manifest.' }
  $manifest = Get-Content -LiteralPath $manifestFile -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($manifest.schemaVersion -ne 3 -or $manifest.snapshotType -ne 'full-vault' -or
      $manifest.algorithm -ne 'sha256' -or $manifest.fileCount -ne @($manifest.entries).Count) {
    Fail 'Backup format or file count invalid.'
  }
  $seen = @{}
  $total = [long]0
  foreach($entry in $manifest.entries) {
    $relative = [string]$entry.path
    $parts = $relative -split '/'
    if ([string]::IsNullOrEmpty($relative) -or $relative.Contains('\') -or
        ($parts | Where-Object { $_ -eq '' -or $_ -eq '.' -or $_ -eq '..' -or $_.Contains(':') }).Count -gt 0 -or
        $seen.ContainsKey($relative.ToLowerInvariant())) { Fail "Unsafe backup path: $relative" }
    $seen[$relative.ToLowerInvariant()] = $true
    $source = Join-Path $content ($relative.Replace('/','\'))
    if (!(Test-Path -LiteralPath $source -PathType Leaf)) { Fail "Missing file: $relative" }
    $info = Get-Item -LiteralPath $source -Force
    if ($info.Attributes -band [IO.FileAttributes]::ReparsePoint) { Fail "Symlinks not supported: $relative" }
    if ([long]$info.Length -ne [long]$entry.size) { Fail "Wrong file length: $relative" }
    if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$entry.sha256) {
      Fail "Checksum mismatch: $relative"
    }
    $total += [long]$info.Length
  }
  if ($total -ne [long]$manifest.totalBytes) { Fail 'Backup total byte count mismatch.' }
  $actual = @(Get-ChildItem -LiteralPath $content -File -Recurse -Force)
  if ($actual.Count -ne [int]$manifest.fileCount) { Fail 'Snapshot contains unexpected or missing files.' }
  $parent = Split-Path -Parent $vault
  $tag = [guid]::NewGuid().ToString('N')
  $stage = Join-Path $parent ('.lifora-restore-' + $tag)
  $previous = Join-Path $parent ('.lifora-before-restore-' + $tag)
  New-Item -ItemType Directory -Path $stage -ErrorAction Stop | Out-Null
  foreach($folder in $manifest.directories) {
    $relative = [string]$folder
    $parts = $relative -split '/'
    if ([string]::IsNullOrWhiteSpace($relative) -or $relative.Contains('\') -or
        ($parts | Where-Object { $_ -eq '' -or $_ -eq '.' -or $_ -eq '..' -or $_.Contains(':') }).Count -gt 0) { Fail "Unsafe folder: $relative" }
    New-Item -ItemType Directory -Path (Join-Path $stage ($relative.Replace('/','\'))) -Force | Out-Null
  }
  Write-Host 'Copying and validating the complete snapshot ...'
  foreach($entry in $manifest.entries) {
    $relative = [string]$entry.path
    $from = Join-Path $content ($relative.Replace('/','\'))
    $to = Join-Path $stage ($relative.Replace('/','\'))
    $parentDir = Split-Path -Parent $to
    if (!(Test-Path -LiteralPath $parentDir)) { New-Item -ItemType Directory -Path $parentDir -Force | Out-Null }
    Copy-Item -LiteralPath $from -Destination $to -Force
    if ((Get-FileHash -LiteralPath $to -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$entry.sha256) {
      Fail "Staging verification failed: $relative"
    }
  }
  if (Test-Path -LiteralPath $vault -PathType Container) {
    [IO.Directory]::Move($vault,$previous)
    $previousMoved = $true
  }
  [IO.Directory]::Move($stage,$vault)
  $stageMoved = $true
  Write-Host "Restored $($manifest.fileCount) files, including .obsidian and all Vault content." -ForegroundColor Green
  if ($previousMoved) {
    try { Remove-Item -LiteralPath $previous -Recurse -Force -ErrorAction Stop }
    catch { Write-Host ('Restore succeeded; an extra safety copy remains at ' + $previous) -ForegroundColor Yellow }
  }
  Write-Host 'Restore succeeded. You can now reopen Obsidian and resume Syncthing.' -ForegroundColor Green
} catch {
  Write-Host ('RESTORE STOPPED: ' + $_.Exception.Message) -ForegroundColor Red
  if ($previousMoved -and !$stageMoved -and !(Test-Path -LiteralPath $vault)) {
    try { [IO.Directory]::Move($previous,$vault); Write-Host 'Original Vault rolled back.' }
    catch { Write-Host ('IMPORTANT: Original Vault is at ' + $previous) -ForegroundColor Yellow }
  }
  Write-Host 'Your original snapshot remains unchanged.' -ForegroundColor Yellow
  exit 1
} finally {
  if (!$stageMoved -and $stage -and (Test-Path -LiteralPath $stage)) {
    Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
  }
}
