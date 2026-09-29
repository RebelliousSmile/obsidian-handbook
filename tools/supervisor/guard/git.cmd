@echo off
rem Supervisor guard for Windows shells: rules in rules.cjs, fails closed.
node "%~dp0run.mjs" git %*
exit /b %ERRORLEVEL%
