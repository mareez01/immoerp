@echo off
REM AMC ERP - Docker Build and Push Script for GitHub Container Registry (Windows)
REM This script builds the Docker image and pushes it to GHCR

setlocal enabledelayedexpansion

REM Configuration
set REGISTRY=ghcr.io
set OWNER=fl-smartech
set IMAGE_NAME=amc-erp
set VERSION=%1
if "%VERSION%"=="" set VERSION=latest

echo ======================================
echo AMC ERP - Build and Publish
echo ======================================

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed
    exit /b 1
)

REM Full image name
set FULL_IMAGE_NAME=%REGISTRY%/%OWNER%/%IMAGE_NAME%:%VERSION%
set LATEST_IMAGE_NAME=%REGISTRY%/%OWNER%/%IMAGE_NAME%:latest

echo.
echo Building Docker image: %FULL_IMAGE_NAME%
echo.

REM Build the Docker image
docker build ^
    --platform linux/amd64 ^
    --tag "%FULL_IMAGE_NAME%" ^
    --tag "%LATEST_IMAGE_NAME%" ^
    .

if errorlevel 1 (
    echo Build failed!
    exit /b 1
)

echo.
echo Build completed successfully
echo.

REM Push to registry
echo Pushing to GitHub Container Registry...
echo.

docker push "%FULL_IMAGE_NAME%"

if errorlevel 1 (
    echo Push failed! Make sure you are logged in to GHCR:
    echo   docker login ghcr.io -u ^<USERNAME^> -p ^<GITHUB_TOKEN^>
    exit /b 1
)

if not "%VERSION%"=="latest" (
    docker push "%LATEST_IMAGE_NAME%"
)

echo.
echo ======================================
echo Image published successfully!
echo ======================================
echo.
echo Image: %FULL_IMAGE_NAME%
echo.
echo To pull this image:
echo   docker pull %FULL_IMAGE_NAME%
echo.
echo To run this image:
echo   docker run -d -p 80:80 %FULL_IMAGE_NAME%
echo.

endlocal
