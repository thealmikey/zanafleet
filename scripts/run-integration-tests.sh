#!/bin/bash
set -e

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Project root is the parent of the scripts directory
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root
cd "$PROJECT_ROOT"

echo "========================================="
echo "Starting SDUI Integration Tests"
echo "Project root: $PROJECT_ROOT"
echo "========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Cleanup function
cleanup() {
  echo -e "${YELLOW}Stopping services...${NC}"
  if [ ! -z "$API_PID" ]; then
    kill $API_PID 2>/dev/null || true
  fi
  if [ ! -z "$WEB_PID" ]; then
    kill $WEB_PID 2>/dev/null || true
  fi
  echo -e "${GREEN}Services stopped${NC}"
}

# Set trap for cleanup
trap cleanup EXIT

# Check if ports are available
check_port() {
  if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}Port $1 is already in use${NC}"
    return 1
  fi
  return 0
}

echo -e "${YELLOW}Checking ports...${NC}"
check_port 3000 || { echo "Please stop any service using port 3000"; exit 1; }
check_port 3001 || { echo "Please stop any service using port 3001"; exit 1; }

echo -e "${GREEN}Starting API server on port 3000...${NC}"
cd "$PROJECT_ROOT"
node dist/main.js > /tmp/api-server.log 2>&1 &
API_PID=$!
cd "$PROJECT_ROOT"

# Wait for API to be ready
echo -e "${YELLOW}Waiting for API to be ready...${NC}"
max_attempts=60
attempt=0
while [ $attempt -lt $max_attempts ]; do
  echo -e "${YELLOW}Attempt $((attempt + 1))/$max_attempts: Checking API health...${NC}"
  if curl -s http://localhost:3000/sdui/screens/login > /dev/null 2>&1; then
    echo -e "${GREEN}API health check passed!${NC}"
    echo -e "${YELLOW}Waiting 5 seconds for app to stabilize...${NC}"
    sleep 5
    echo -e "${GREEN}API is ready!${NC}"
    break
  fi
  attempt=$((attempt + 1))
  echo -e "${YELLOW}API not ready yet, waiting 2 seconds...${NC}"
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo -e "${RED}API failed to start. Check logs at /tmp/api-server.log${NC}"
  exit 1
fi

echo -e "${GREEN}Starting web client on port 3001...${NC}"
cd "$PROJECT_ROOT/apps/web"
# Use yes to automatically answer "y" to port conflict prompt
echo "y" | PORT=3001 npm run start > /tmp/web-client.log 2>&1 &
WEB_PID=$!
cd "$PROJECT_ROOT"

# Wait for web to be ready
echo -e "${YELLOW}Waiting for web client to be ready...${NC}"
attempt=0
while [ $attempt -lt $max_attempts ]; do
  echo -e "${YELLOW}Attempt $((attempt + 1))/$max_attempts: Checking web client...${NC}"
  if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}Web client is ready!${NC}"
    break
  fi
  attempt=$((attempt + 1))
  echo -e "${YELLOW}Web client not ready yet, waiting 2 seconds...${NC}"
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo -e "${RED}Web client failed to start. Check logs at /tmp/web-client.log${NC}"
  exit 1
fi

echo -e "${GREEN}Running Selenium tests...${NC}"
cd "$PROJECT_ROOT/apps/web"
npm run test:e2e

echo -e "${GREEN}========================================="
echo "All tests completed!"
echo "========================================="