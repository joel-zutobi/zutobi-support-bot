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
$files = Get-ChildItem -LiteralPath $skillRoot -File -Recurse | Sort-Object FullName
$allSkillText = [string]::Join("`n", @($files | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw }))

if ($skillText -notmatch '(?m)^name: zutobi-support$') {
    throw 'SKILL.md frontmatter must declare name: zutobi-support'
}

if ($allSkillText.Contains([char]0x2014)) {
    throw 'Skill source contains an em dash.'
}

if ([regex]::IsMatch($allSkillText, '\bAnna\b')) {
    throw 'Skill source contains the retired Anna signature.'
}

if ($allSkillText.Contains('lolwadream')) {
    throw 'Skill source contains the removed account-email example.'
}

$retiredToolNames = @('create_draft', 'list_drafts', 'search_threads', 'messageFormat')
foreach ($toolName in $retiredToolNames) {
    if ($allSkillText.Contains($toolName)) {
        throw "Skill source contains retired Gmail tool name: $toolName"
    }
}

if (-not $skillText.Contains('maxResults: 50')) {
    throw 'SKILL.md must keep the 50-thread inbox limit.'
}

$requiredReferences = @(
    'references\templates.md',
    'references\refunds.md'
)
foreach ($reference in $requiredReferences) {
    if (-not (Test-Path -LiteralPath (Join-Path $skillRoot $reference) -PathType Leaf)) {
        throw "Missing skill reference: $reference"
    }
}

$requiredToolNames = @('list_inbox_threads', 'get_thread', 'draft_email')
foreach ($toolName in $requiredToolNames) {
    if (-not $skillText.Contains($toolName)) {
        throw "SKILL.md is missing Gmail tool name: $toolName"
    }
}

$requiredLinks = @(
    'https://zutobi.com/us/faq/managing-my-subscription-trial-and-billing',
    'https://support.apple.com/en-us/HT202039',
    'https://support.apple.com/en-us/HT204084',
    'https://support.google.com/googleplay/answer/7205930'
)
foreach ($link in $requiredLinks) {
    if (-not $allSkillText.Contains($link)) {
        throw "Skill source is missing canonical link: $link"
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
