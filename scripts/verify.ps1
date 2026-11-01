[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$apiPython = Join-Path $repositoryRoot 'services\api\.venv\Scripts\python.exe'

Push-Location $repositoryRoot
try {
    if (-not $env:DATABASE_URL) {
        $localEnvironment = Join-Path $repositoryRoot '.env'
        if (Test-Path -LiteralPath $localEnvironment) {
            $databaseLine = Get-Content -LiteralPath $localEnvironment |
                Where-Object { $_ -match '^DATABASE_URL=' } |
                Select-Object -First 1
            if ($databaseLine) {
                $env:DATABASE_URL = $databaseLine.Substring('DATABASE_URL='.Length)
            }
        }
    }
    corepack pnpm lint
    corepack pnpm typecheck
    corepack pnpm build
    & $apiPython -m ruff check services/api/app services/api/tests
    & $apiPython -m mypy services/api/app
    & $apiPython -m pytest services/api/tests
    & $apiPython -m alembic -c services/api/alembic.ini check
    & $apiPython services/api/scripts/audit_schema.py
    & $apiPython tests/db/smoke_test.py
}
finally {
    Pop-Location
}
