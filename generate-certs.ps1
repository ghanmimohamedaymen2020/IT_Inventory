# Script pour générer des certificats SSL auto-signés pour localhost

Write-Host "Génération des certificats SSL pour localhost..." -ForegroundColor Cyan

# Vérifier si mkcert est installé
$mkcertInstalled = Get-Command mkcert -ErrorAction SilentlyContinue

if ($mkcertInstalled) {
    Write-Host "Utilisation de mkcert..." -ForegroundColor Green
    
    # Installer l'autorité de certification locale
    mkcert -install
    
    # Générer les certificats
    Set-Location certificates
    mkcert localhost 127.0.0.1 ::1
    
    # Renommer les fichiers
    if (Test-Path "localhost+2.pem") {
        Rename-Item "localhost+2.pem" "localhost.pem"
    }
    if (Test-Path "localhost+2-key.pem") {
        Rename-Item "localhost+2-key.pem" "localhost-key.pem"
    }
    
    Set-Location ..
    Write-Host "✓ Certificats générés avec mkcert" -ForegroundColor Green
} else {
    Write-Host "mkcert non trouvé. Utilisation de OpenSSL..." -ForegroundColor Yellow
    
    # Vérifier si OpenSSL est disponible
    $opensslInstalled = Get-Command openssl -ErrorAction SilentlyContinue
    
    if ($opensslInstalled) {
        Set-Location certificates
        
        # Générer la clé privée et le certificat
        openssl req -x509 -newkey rsa:4096 -keyout localhost-key.pem -out localhost.pem -days 365 -nodes -subj "/C=TN/ST=Tunis/L=Tunis/O=Development/CN=localhost"
        
        Set-Location ..
        Write-Host "✓ Certificats générés avec OpenSSL" -ForegroundColor Green
    } else {
        Write-Host "❌ Ni mkcert ni OpenSSL trouvés." -ForegroundColor Red
        Write-Host ""
        Write-Host "Options d'installation:" -ForegroundColor Yellow
        Write-Host "1. mkcert (recommandé) :" -ForegroundColor Cyan
        Write-Host "   choco install mkcert" -ForegroundColor White
        Write-Host ""
        Write-Host "2. OpenSSL :" -ForegroundColor Cyan
        Write-Host "   choco install openssl" -ForegroundColor White
        Write-Host ""
        exit 1
    }
}

Write-Host ""
Write-Host "✓ Configuration HTTPS terminée!" -ForegroundColor Green
Write-Host "Utilisez 'npm run dev:https' pour démarrer le serveur HTTPS" -ForegroundColor Cyan
