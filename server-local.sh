#!/bin/bash

# Hype-Hack1 — Local Docker Dev Runner
# Builds the Docker image and runs the server locally.

set -e
set -o pipefail

START_TS=$(date '+%Y-%m-%d %H:%M:%S')
echo "🚀 Starting local dev (Docker)"
echo "📅 Started at: $START_TS"

# Ensure we are at repo root (Dockerfile must exist)
if [ ! -f "Dockerfile" ]; then
  echo "❌ Error: Dockerfile not found. Run this script from the repo root"
  exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
  echo "❌ Error: Docker is not installed"
  echo "   Install: https://docs.docker.com/get-docker/"
  exit 1
fi

IMAGE_NAME="hype-app-local"
CONTAINER_NAME="hype-app-local"
PORT=${PORT:-3000}

echo "🐳 Building Docker image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" .

# Stop/remove existing container if running
if [ "$(docker ps -aq -f name=^/${CONTAINER_NAME}$)" ]; then
  echo "🧹 Stopping existing container: $CONTAINER_NAME"
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
fi

RUN_ARGS=(
  -p "$PORT:3000"
  --name "$CONTAINER_NAME"
  --rm
)

# Pass .env if present
if [ -f ".env" ]; then
  echo "🔑 Using environment from .env"
  RUN_ARGS+=( --env-file .env )
fi

echo "🏃 Running container on http://localhost:$PORT"
docker run "${RUN_ARGS[@]}" "$IMAGE_NAME"

