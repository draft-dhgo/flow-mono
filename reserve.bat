@echo off
REM 예약 실행 스크립트 (Windows) — generate-loop-prompt 스킬이 PROMPT_FILE을 자동 설정한다.
REM 사용법: reserve.bat [hours] [minutes]
REM 예시:   reserve.bat 2 30     (2시간 30분 후 실행)
REM         reserve.bat 0 10     (10분 후 실행)
REM         reserve.bat           (기본값: 10분 후 실행)

set PROMPT_FILE=loop-save\frontend-quality-improvement-prompt.txt

if "%~1"=="" (set HOURS=0) else (set HOURS=%~1)
if "%~2"=="" (set MINUTES=10) else (set MINUTES=%~2)

if not exist "%PROMPT_FILE%" (
  echo 오류: 프롬프트 파일을 찾을 수 없습니다: %PROMPT_FILE%
  echo.
  echo 사용 가능한 프롬프트 파일:
  dir /b loop-save\*.txt 2>nul
  exit /b 1
)

echo 프롬프트: %PROMPT_FILE%
set /a TOTAL_SECONDS=%HOURS%*3600+%MINUTES%*60

if %TOTAL_SECONDS% gtr 0 (
  echo 실행 예정: %HOURS%시간 %MINUTES%분 후
  timeout /t %TOTAL_SECONDS% /nobreak
)

echo 실행 시작!

(echo /ralph-loop:ralph-loop & echo " & type "%PROMPT_FILE%" & echo ") | claude --dangerously-skip-permissions
