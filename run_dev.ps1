# Deccan Mission High School ERP - Quick Development Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " DECCAN MISSION HIGH SCHOOL ERP - LOCAL DEV ENVIRONMENT" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$env:Path = [Environment]::GetEnvironmentVariable("Path", "User") + ";" + [Environment]::GetEnvironmentVariable("Path", "Machine")

# Ensure database migrations are up to date
Write-Host "`n[1/3] Applying Alembic Migrations..." -ForegroundColor Green
Set-Location -Path "backend"
python -m alembic upgrade head
Set-Location -Path ".."

# Start Backend Server in Background Job
Write-Host "`n[2/3] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    Set-Location -Path $using:PWD\backend
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
}

# Start Frontend Dev Server
Write-Host "`n[3/3] Starting Vite Frontend on http://localhost:5173..." -ForegroundColor Green
Write-Host "Access Portals:" -ForegroundColor Cyan
Write-Host "  Admin Portal:   admin    / Admin@DMHS2026" -ForegroundColor White
Write-Host "  Teacher Portal: teacher1 / Teacher@DMHS2026" -ForegroundColor White
Write-Host "  Student Portal: student1 / Student@DMHS2026" -ForegroundColor White
Write-Host "`nPress CTRL+C in this console to stop the frontend server.`n" -ForegroundColor Yellow

Set-Location -Path "frontend"
npm run dev

# Cleanup when frontend finishes
Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
Remove-Job -Job $backendJob -ErrorAction SilentlyContinue
Set-Location -Path ".."
