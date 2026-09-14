[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot 'validate.ps1')

$lookupMcp = Join-Path $repoRoot 'mcp\zutobi-user-lookup'
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Push-Location $lookupMcp
    try {
        npm ci
        if ($LASTEXITCODE -ne 0) {
            throw "npm ci failed for the Zutobi user lookup MCP."
        }
        npm test
        if ($LASTEXITCODE -ne 0) {
            throw "npm test failed for the Zutobi user lookup MCP."
        }
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Warning 'Node.js and npm were not found. Skipping the Zutobi user lookup MCP setup.'
}

Write-Output ''
Write-Output 'Local setup is complete.'
Write-Output 'Install dist\zutobi-support.skill in Claude, then follow docs\setup-gmail-mcp.md to connect Google Gmail MCP.'
Write-Output 'Remote MCP URL: https://gmailmcp.googleapis.com/mcp/v1'
Write-Output 'Follow docs\setup-zutobi-user-lookup-mcp.md to configure the local account lookup MCP.'
