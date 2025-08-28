#!/bin/bash

# Cleanup crypto exchange deployments
set -e

echo "🧹 Cleaning up Crypto Exchange deployments..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CLEANUP_TYPE=${1:-all}
NAMESPACE="crypto-exchange"

case $CLEANUP_TYPE in
    "docker")
        echo -e "${YELLOW}🐳 Cleaning up Docker Compose deployment...${NC}"
        docker-compose down -v --remove-orphans
        echo -e "${YELLOW}🗑️  Removing Docker images...${NC}"
        docker rmi $(docker images crypto-exchange* -q) 2>/dev/null || true
        echo -e "${GREEN}✅ Docker cleanup completed!${NC}"
        ;;
        
    "k8s"|"kubernetes")
        echo -e "${YELLOW}☸️  Cleaning up Kubernetes deployment...${NC}"
        if kubectl get namespace ${NAMESPACE} &> /dev/null; then
            kubectl delete namespace ${NAMESPACE}
            echo -e "${YELLOW}⏳ Waiting for namespace deletion...${NC}"
            kubectl wait --for=delete namespace/${NAMESPACE} --timeout=300s
            echo -e "${GREEN}✅ Kubernetes cleanup completed!${NC}"
        else
            echo -e "${BLUE}ℹ️  Namespace ${NAMESPACE} not found${NC}"
        fi
        ;;
        
    "all")
        echo -e "${YELLOW}🧹 Performing complete cleanup...${NC}"
        
        # Docker cleanup
        echo -e "${YELLOW}🐳 Cleaning up Docker...${NC}"
        docker-compose down -v --remove-orphans 2>/dev/null || true
        docker rmi $(docker images crypto-exchange* -q) 2>/dev/null || true
        
        # Kubernetes cleanup
        echo -e "${YELLOW}☸️  Cleaning up Kubernetes...${NC}"
        if command -v kubectl &> /dev/null && kubectl get namespace ${NAMESPACE} &> /dev/null; then
            kubectl delete namespace ${NAMESPACE}
            kubectl wait --for=delete namespace/${NAMESPACE} --timeout=300s
        fi
        
        # Clean up build artifacts
        echo -e "${YELLOW}🗑️  Cleaning up build artifacts...${NC}"
        rm -rf frontend/dist frontend/node_modules/.vite || true
        rm -rf backend/node_modules/.cache || true
        
        echo -e "${GREEN}✅ Complete cleanup finished!${NC}"
        ;;
        
    *)
        echo -e "${RED}❌ Invalid cleanup type: ${CLEANUP_TYPE}${NC}"
        echo -e "${BLUE}Usage: $0 [docker|k8s|all]${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}🎉 Cleanup completed successfully!${NC}"