# Supabase Database Export Script
# Usage: .\export_db.ps1 -ProjectID "your-project-id"

param (
    [Parameter(Mandatory=$true)]
    [string]$ProjectID
)

$OutputFile = "supabase_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
$HostName = "db.$ProjectID.supabase.co"
$User = "postgres"
$Database = "postgres"

Write-Host "Exporting database from $HostName..." -ForegroundColor Cyan
Write-Host "You will be prompted for your database password." -ForegroundColor Yellow

# Check if pg_dump is installed
if (!(Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-Error "pg_dump is not installed. Please install PostgreSQL tools."
    return
}

pg_dump -h $HostName -U $User -d $Database -f $OutputFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully exported to $OutputFile" -ForegroundColor Green
} else {
    Write-Host "Export failed with exit code $LASTEXITCODE" -ForegroundColor Red
}
