@echo off
echo ============================================
echo Cleaning up for fresh React Native install...
echo ============================================

echo.
echo Deleting node_modules...
rmdir /s /q node_modules

echo.
echo Deleting package-lock.json...
del /f /q package-lock.json

echo.
echo Deleting node modules/cache...
rm -rf node_modules/.cache

echo.
echo Clearing npm cache...
npm cache clean --force

echo.
echo Clearing Metro bundler cache...
set TEMP_DIR=%LOCALAPPDATA%\Temp
for /d %%i in ("%TEMP_DIR%\metro-*") do (
    echo Deleting %%i
    rmdir /s /q "%%i"
)

echo.
echo Clearing React Native packager cache...
if exist "%APPDATA%\React Native\packager" (
    rmdir /s /q "%APPDATA%\React Native\packager"
)

echo.
echo Installing npm packages again...
call npm install

echo.
echo ============================================
echo Cleanup & reinstall complete!
echo Now run: npx expo start --dev-client --clear
echo ============================================

pause
