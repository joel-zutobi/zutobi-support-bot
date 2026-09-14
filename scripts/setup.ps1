[CmdletBinding()]
param(
    [switch]$AuthenticateReadOnly
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$repoGitPath = $repoRoot.Replace('\', '/')
$serverRoot = Join-Path $repoRoot 'vendor\gmail-mcp-server'
$serverEntry = Join-Path $serverRoot 'dist\index.js'
$configOutput = Join-Path $repoRoot 'dist\claude-desktop-mcp.json'

Push-Location $repoRoot
try {
    & git -c "safe.directory=$repoGitPath" submodule update --init --recursive
    if ($LASTEXITCODE -ne 0) {
        throw "git submodule update failed with exit code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath (Join-Path $serverRoot 'package-lock.json') -PathType Leaf)) {
    throw "Gmail MCP submodule is missing or incomplete: $serverRoot"
}

Push-Location $serverRoot
try {
    & npm ci
    if ($LASTEXITCODE -ne 0) {
        throw "npm ci failed with exit code $LASTEXITCODE"
    }

    & npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed with exit code $LASTEXITCODE"
    }

    & npm prune --omit=dev
    if ($LASTEXITCODE -ne 0) {
        throw "npm prune failed with exit code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

& (Join-Path $PSScriptRoot 'package.ps1')

$config = [ordered]@{
    mcpServers = [ordered]@{
        gmail = [ordered]@{
            command = 'node'
            args = @([IO.Path]::GetFullPath($serverEntry))
        }
    }
}

$configJson = $config | ConvertTo-Json -Depth 5
$utf8WithoutBom = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText($configOutput, $configJson + [Environment]::NewLine, $utf8WithoutBom)

Write-Output "Created MCP config snippet: $configOutput"

if ($AuthenticateReadOnly) {
    & node $serverEntry auth --scopes=gmail.readonly
    if ($LASTEXITCODE -ne 0) {
        throw "Gmail read-only authorization failed with exit code $LASTEXITCODE"
    }
}
else {
    Write-Output 'OAuth was not started. Follow docs/setup-gmail-mcp.md when the Gmail account owner is ready.'
}
