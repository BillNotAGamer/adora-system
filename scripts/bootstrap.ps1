[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$apiRoot = Join-Path $repositoryRoot 'services\api'
$venvPython = Join-Path $apiRoot '.venv\Scripts\python.exe'

Push-Location $repositoryRoot
try {
    corepack pnpm install --frozen-lockfile

    if (-not (Test-Path -LiteralPath $venvPython)) {
        python -m venv (Join-Path $apiRoot '.venv')
    }
    & $venvPython -m pip install --requirement (Join-Path $apiRoot 'requirements.lock')
}
finally {
    Pop-Location
}
