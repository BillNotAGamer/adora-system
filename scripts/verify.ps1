[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$apiPython = Join-Path $repositoryRoot 'services\api\.venv\Scripts\python.exe'

Push-Location $repositoryRoot
try {
    corepack pnpm lint
    corepack pnpm typecheck
    corepack pnpm build
    & $apiPython -m ruff check services/api/app services/api/tests
    & $apiPython -m mypy services/api/app
    & $apiPython -m pytest services/api/tests
}
finally {
    Pop-Location
}
