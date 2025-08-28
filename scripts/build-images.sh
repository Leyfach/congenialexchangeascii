#!/bin/bash

# Build Docker images for crypto exchange platform
set -e

echo "🏗️  Building Crypto Exchange Docker Images..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_TAG=${1:-latest}
REGISTRY=${DOCKER_REGISTRY:-crypto-exchange}

echo -e "${BLUE}📦 Image tag: ${IMAGE_TAG}${NC}"
echo -e "${BLUE}📦 Registry: ${REGISTRY}${NC}"

# Build backend image
echo -e "${YELLOW}🔨 Building backend image...${NC}"
cd backend
docker build -t ${REGISTRY}/backend:${IMAGE_TAG} .
cd ..

# Build frontend image
echo -e "${YELLOW}🔨 Building frontend image...${NC}"
cd frontend
docker build -t ${REGISTRY}/frontend:${IMAGE_TAG} .
cd ..

# Tag as latest if not already
if [ "${IMAGE_TAG}" != "latest" ]; then
    echo -e "${YELLOW}🏷️  Tagging as latest...${NC}"
    docker tag ${REGISTRY}/backend:${IMAGE_TAG} ${REGISTRY}/backend:latest
    docker tag ${REGISTRY}/frontend:${IMAGE_TAG} ${REGISTRY}/frontend:latest
fi

echo -e "${GREEN}✅ All images built successfully!${NC}"

# Show built images
echo -e "${BLUE}📋 Built images:${NC}"
docker images | grep ${REGISTRY}

echo -e "${GREEN}🎉 Build completed!${NC}"