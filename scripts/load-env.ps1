# Loads key=value pairs from the repo-root .env into this PowerShell process.
# Skips comments and blank lines. Does not print secret values.

param(
    [string]$EnvFile = (Join-Path $PSScriptRoot "..\.env")
)

if (-not (Test-Path $EnvFile)) {
    Write-Error "Missing $EnvFile. Copy .env.example to .env and set DB_PASSWORD."
    exit 1
}

Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) {
        return
    }
    $pair = $line.Split("=", 2)
    if ($pair.Length -ne 2) {
        return
    }
    $name = $pair[0].Trim()
    $value = $pair[1].Trim()
    Set-Item -Path "Env:$name" -Value $value
}

Write-Host "Loaded environment from $EnvFile"
