[CmdletBinding()]
param(
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$skillRoot = Join-Path $repoRoot 'skills\zutobi-support'
$skillFile = Join-Path $skillRoot 'SKILL.md'

if (-not $OutputPath) {
    $OutputPath = Join-Path $repoRoot 'dist\zutobi-support.skill'
}

if (-not (Test-Path -LiteralPath $skillFile -PathType Leaf)) {
    throw "Missing skill entrypoint: $skillFile"
}

$skillText = Get-Content -LiteralPath $skillFile -Raw

if ($skillText -notmatch '(?m)^name: zutobi-support$') {
    throw 'SKILL.md frontmatter must declare name: zutobi-support'
}

if ($skillText.Contains([char]0x2014)) {
    throw 'SKILL.md contains an em dash.'
}

$retiredToolNames = @('create_draft', 'list_drafts', 'search_threads', 'messageFormat')
foreach ($toolName in $retiredToolNames) {
    if ($skillText.Contains($toolName)) {
        throw "SKILL.md contains retired Gmail tool name: $toolName"
    }
}

$requiredToolNames = @('list_inbox_threads', 'get_thread', 'draft_email')
foreach ($toolName in $requiredToolNames) {
    if (-not $skillText.Contains($toolName)) {
        throw "SKILL.md is missing Gmail tool name: $toolName"
    }
}

$outputFullPath = [IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path -Parent $outputFullPath
[IO.Directory]::CreateDirectory($outputDirectory) | Out-Null

if (Test-Path -LiteralPath $outputFullPath) {
    Remove-Item -LiteralPath $outputFullPath -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$archive = [IO.Compression.ZipFile]::Open($outputFullPath, [IO.Compression.ZipArchiveMode]::Create)
$fixedTimestamp = [DateTimeOffset]::new(1980, 1, 1, 0, 0, 0, [TimeSpan]::Zero)

try {
    $files = Get-ChildItem -LiteralPath $skillRoot -File -Recurse | Sort-Object FullName
    foreach ($file in $files) {
        $relativePath = $file.FullName.Substring($skillRoot.Length).TrimStart('\', '/').Replace('\', '/')
        $entryPath = "zutobi-support/$relativePath"
        $entry = $archive.CreateEntry($entryPath, [IO.Compression.CompressionLevel]::Optimal)
        $entry.LastWriteTime = $fixedTimestamp

        $inputStream = [IO.File]::OpenRead($file.FullName)
        $outputStream = $entry.Open()
        try {
            $inputStream.CopyTo($outputStream)
        }
        finally {
            $outputStream.Dispose()
            $inputStream.Dispose()
        }
    }
}
finally {
    $archive.Dispose()
}

$hash = (Get-FileHash -LiteralPath $outputFullPath -Algorithm SHA256).Hash.ToLowerInvariant()
Write-Output "Created $outputFullPath"
Write-Output "SHA256 $hash"
