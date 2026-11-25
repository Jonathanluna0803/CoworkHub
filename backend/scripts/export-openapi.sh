#!/usr/bin/env sh
set -eu
mkdir -p docs
curl -fsS http://localhost:8080/v3/api-docs -o docs/openapi.json
printf 'OpenAPI exported to docs/openapi.json\n'
