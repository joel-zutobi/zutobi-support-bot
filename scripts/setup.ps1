[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot 'validate.ps1')

Write-Output ''
Write-Output 'Local setup is complete.'
Write-Output 'Install dist\zutobi-support.skill in Claude, then follow docs\setup-gmail-mcp.md to connect Google Gmail MCP.'
Write-Output 'Remote MCP URL: https://gmailmcp.googleapis.com/mcp/v1'
