@echo off
setlocal
cd /d "%~dp0"
echo Installing project dependencies...
call npm install
if errorlevel 1 goto :error

echo.
echo Checking Google Sign-In package...
call npm ls @react-native-google-signin/google-signin
if errorlevel 1 goto :error

echo.
echo Validating Expo configuration...
call npx expo config --type public
if errorlevel 1 goto :error

echo.
echo Rebuilding native Android project...
call npx expo prebuild --clean --platform android
if errorlevel 1 goto :error

call npx expo run:android
if errorlevel 1 goto :error

echo.
echo Done.
pause
exit /b 0

:error
echo.
echo Setup failed. Read README_FIX.txt in the parent folder for manual recovery steps.
pause
exit /b 1
