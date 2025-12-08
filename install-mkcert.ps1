# Installation de mkcert pour des certificats SSL de confiance

Write-Host "Installation de mkcert..." -ForegroundColor Cyan

# Vérifier si Chocolatey est installé
$chocoInstalled = Get-Command choco -ErrorAction SilentlyContinue

if ($chocoInstalled) {
    Write-Host "Installation de mkcert avec Chocolatey..." -ForegroundColor Green
    choco install mkcert -y
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✓ mkcert installé avec succès!" -ForegroundColor Green
        Write-Host "`nMaintenant exécutez:" -ForegroundColor Cyan
        Write-Host "  npm run certs:generate" -ForegroundColor White
        Write-Host "  npm run dev:https" -ForegroundColor White
    } else {
        Write-Host "`n❌ Erreur lors de l'installation" -ForegroundColor Red
    }
} else {
    Write-Host "Chocolatey n'est pas installé." -ForegroundColor Yellow
    Write-Host "`nOptions:" -ForegroundColor Cyan
    Write-Host "`n1. Installer Chocolatey puis mkcert:" -ForegroundColor Yellow
    Write-Host "   - Ouvrez PowerShell en Administrateur" -ForegroundColor White
    Write-Host "   - Exécutez: Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" -ForegroundColor Gray
    Write-Host "   - Puis: choco install mkcert -y" -ForegroundColor White
    Write-Host "`n2. Télécharger mkcert manuellement:" -ForegroundColor Yellow
    Write-Host "   - https://github.com/FiloSottile/mkcert/releases" -ForegroundColor White
    Write-Host "`n3. Continuer avec le certificat actuel:" -ForegroundColor Yellow
    Write-Host "   - Acceptez l'avertissement dans Firefox/Chrome" -ForegroundColor White
}
