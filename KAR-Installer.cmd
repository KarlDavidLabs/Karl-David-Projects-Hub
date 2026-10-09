@echo off
title KAR Installer
color 0B

echo.
echo ==========================================
echo          KAR INSTALLER
echo ==========================================
echo.

winget --version

if errorlevel 1 (
    echo Winget est indisponible.
    pause
    exit /b 1
)

echo.

echo Installation de GIMP.GIMP...
winget install --id GIMP.GIMP --exact --accept-source-agreements --accept-package-agreements


echo.
echo Installation terminee.
pause
