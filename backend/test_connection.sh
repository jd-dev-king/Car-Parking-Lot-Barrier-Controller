#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8000}"

echo "Checking API/database health at ${BASE_URL}/api/health"
curl -fsS "${BASE_URL}/api/health"
echo

echo "Checking parking status"
curl -fsS "${BASE_URL}/api/parking/status"
echo
