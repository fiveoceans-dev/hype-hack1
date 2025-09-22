#!/bin/bash

# Hype-Hack1 — Heroku Docker Deployment Script
# Deploys the app to Heroku using the Container Registry.

set -e
set -o pipefail

DEPLOYMENT_TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "🚀 Deploying Hype-Hack1 to Heroku using Docker..."
echo "📅 Deployment started at: $DEPLOYMENT_TIMESTAMP"

# Check for Dockerfile at repo root
if [ ! -f "Dockerfile" ]; then
    echo "❌ Error: Dockerfile not found. Run this script from the repository root."
    exit 1
fi

# Heroku CLI
if ! command -v heroku &> /dev/null; then
    echo "❌ Error: Heroku CLI is not installed"
    echo "   Install: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Heroku login
if ! heroku whoami &> /dev/null; then
    echo "❌ Error: Not logged in to Heroku"
    echo "   Run: heroku login"
    exit 1
fi

# Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "   Install: https://docs.docker.com/get-docker/"
    exit 1
fi

# Ensure Docker daemon is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker daemon is not running"
    if [ "$(uname)" = "Darwin" ] && [ -d "/Applications/Docker.app" ]; then
        echo "🟡 Attempting to start Docker Desktop..."
        open -a Docker || true
        echo "⏳ Waiting for Docker to start (up to 60s)..."
        for i in {1..30}; do
            sleep 2
            if docker info >/dev/null 2>&1; then
                echo "✅ Docker is now running"
                break
            fi
            echo -n "."
        done
    fi
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Still cannot connect to the Docker daemon."
        echo "   Please start Docker Desktop (or your Docker engine) and retry."
        exit 1
    fi
fi

read -p "Enter your Heroku app name [hype-hack1-app]: " APP_NAME
APP_NAME=${APP_NAME:-hype-hack1-app}

# Create app if missing
if ! heroku apps:info "$APP_NAME" &> /dev/null; then
    echo "📱 Creating Heroku app: $APP_NAME"
    heroku create "$APP_NAME"
    echo "✅ App created"
else
    echo "📱 Using existing Heroku app: $APP_NAME"
fi

echo "🐳 Setting Heroku stack to container..."
heroku stack:set container -a "$APP_NAME"

# Optionally load .env to Heroku
if [ -f .env ]; then
  read -p "Load variables from .env to Heroku config? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔧 Loading .env to Heroku (non-empty lines without comments)"
    while IFS='=' read -r key value; do
      if [[ -n "$key" && ! "$key" =~ ^# ]]; then
        heroku config:set "$key"="$value" -a "$APP_NAME" || true
      fi
    done < <(grep -v '^#' .env | sed '/^$/d')
  fi
fi

echo "🔐 Ensuring NODE_ENV=production"
heroku config:set NODE_ENV=production -a "$APP_NAME"

echo "🔗 Logging into Heroku Container Registry..."
heroku container:login

echo "📦 Pushing Docker image to Heroku..."
heroku container:push web -a "$APP_NAME"

echo "🚀 Releasing image..."
heroku container:release web -a "$APP_NAME"

echo "⏳ Waiting a few seconds before verification..."
sleep 8

echo "🔍 Checking dyno status..."
heroku ps -a "$APP_NAME" || true

echo "📝 Recent logs:"
heroku logs --tail --num 50 -a "$APP_NAME"

echo "✅ Deployment initiated. App should be available soon: https://$APP_NAME.herokuapp.com"
