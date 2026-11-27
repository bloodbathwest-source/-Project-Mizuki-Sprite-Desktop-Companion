@echo off
title Mizuki Desktop Companion
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Node.js is not installed on this computer yet.
  echo Install it free from https://nodejs.org  then run this file again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo First run: installing Mizuki's pieces... this takes a minute or two.
  call npm install
)
echo Starting Mizuki...
call npm start
pause
