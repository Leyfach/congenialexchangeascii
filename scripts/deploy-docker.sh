#!/bin/bash

# Deploy crypto exchange using Docker Compose
set -e

echo "🚀 Deploying Crypto Exchange with Docker Compose..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE=${1:-.env}
COMPOSE_FILE="docker-compose.yml"

# Check if .env file exists
if [ ! -f "${ENV_FILE}" ]; then
    echo -e "${YELLOW}⚠️  Environment file ${ENV_FILE} not found. Creating from example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example ${ENV_FILE}
        echo -e "${YELLOW}📝 Please edit ${ENV_FILE} with your configuration before running again.${NC}"
        exit 1
    else
        echo -e "${RED}❌ No .env.example file found!${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}📋 Using environment file: ${ENV_FILE}${NC}"

# Build images first
echo -e "${YELLOW}🔨 Building images...${NC}"
./scripts/build-images.sh

# Create necessary directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/provisioning

# Deploy with docker-compose
echo -e "${YELLOW}🚀 Starting services...${NC}"
docker-compose --env-file ${ENV_FILE} -f ${COMPOSE_FILE} up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Check service health
echo -e "${BLUE}🔍 Checking service health...${NC}"
docker-compose ps

# Show service URLs
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${BLUE}🌐 Service URLs:${NC}"
echo -e "   Frontend:    http://localhost"
echo -e "   Backend API: http://localhost:3000"
echo -e "   Grafana:     http://localhost:3001 (admin/admin123)"
echo -e "   Prometheus:  http://localhost:9090"

echo -e "${GREEN}🎉 Crypto Exchange is now running!${NC}"