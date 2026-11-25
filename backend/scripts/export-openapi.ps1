$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path docs | Out-Null
Invoke-WebRequest -Uri 'http://localhost:8080/v3/api-docs' -OutFile 'docs/openapi.json'
Write-Host 'OpenAPI exportado a docs/openapi.json'
