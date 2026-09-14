[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$casesPath = Join-Path $repoRoot 'tests\cases.json'

& (Join-Path $PSScriptRoot 'package.ps1')

if (-not (Test-Path -LiteralPath $casesPath -PathType Leaf)) {
    throw "Missing behavior cases: $casesPath"
}

$cases = Get-Content -LiteralPath $casesPath -Raw | ConvertFrom-Json
if ($cases.Count -eq 0) {
    throw 'Behavior case set is empty.'
}

$duplicateIds = @($cases | Group-Object id | Where-Object Count -gt 1)
if ($duplicateIds.Count -gt 0) {
    throw "Duplicate behavior case IDs: $($duplicateIds.Name -join ', ')"
}

$allowedDispositions = @(
    'draft',
    'refund_gate',
    'human_review',
    'skip',
    'skip_existing_draft',
    'preview'
)

foreach ($case in $cases) {
    if (-not $case.id -or -not $case.input -or -not $case.expected) {
        throw 'Every behavior case needs id, input, and expected fields.'
    }

    if ($allowedDispositions -notcontains $case.expected.disposition) {
        throw "Case $($case.id) has invalid disposition: $($case.expected.disposition)"
    }

    $category = $case.expected.category
    if ($null -ne $category -and ($category -lt 1 -or $category -gt 16)) {
        throw "Case $($case.id) has invalid category: $category"
    }

    if ($case.input.mode -eq 'draft' -and @(1, 2, 3, 7) -contains $category) {
        if (@('refund_gate', 'human_review') -notcontains $case.expected.disposition) {
            throw "Refund case $($case.id) bypasses the refund gate."
        }
    }
}

$coveredCategories = @($cases | ForEach-Object { $_.expected.category } | Where-Object { $null -ne $_ } | Sort-Object -Unique)
$missingCategories = @(1..16 | Where-Object { $coveredCategories -notcontains $_ })
if ($missingCategories.Count -gt 0) {
    throw "Behavior cases do not cover categories: $($missingCategories -join ', ')"
}

Write-Output "Validated $($cases.Count) behavior cases with coverage for all 16 categories."
