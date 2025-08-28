#!/bin/bash

# Deploy crypto exchange to Kubernetes
set -e

echo "☸️  Deploying Crypto Exchange to Kubernetes..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="crypto-exchange"
K8S_DIR="k8s"
REGISTRY=${DOCKER_REGISTRY:-crypto-exchange}
IMAGE_TAG=${1:-latest}

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed or not in PATH${NC}"
    exit 1
fi

# Check if cluster is reachable
echo -e "${BLUE}🔍 Checking Kubernetes cluster...${NC}"
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Kubernetes cluster is reachable${NC}"

# Build and push images
echo -e "${YELLOW}🔨 Building and pushing images...${NC}"
./scripts/build-images.sh ${IMAGE_TAG}

# If using a remote registry, push images
if [ "${REGISTRY}" != "crypto-exchange" ]; then
    echo -e "${YELLOW}📤 Pushing images to registry...${NC}"
    docker push ${REGISTRY}/backend:${IMAGE_TAG}
    docker push ${REGISTRY}/frontend:${IMAGE_TAG}
fi

# Create namespace
echo -e "${YELLOW}📁 Creating namespace...${NC}"
kubectl apply -f ${K8S_DIR}/01-namespace.yaml

# Apply configurations
echo -e "${YELLOW}⚙️  Applying configurations...${NC}"
kubectl apply -f ${K8S_DIR}/02-configmap.yaml
kubectl apply -f ${K8S_DIR}/03-secrets.yaml

# Apply persistent volumes
echo -e "${YELLOW}💾 Creating persistent volumes...${NC}"
kubectl apply -f ${K8S_DIR}/04-persistent-volumes.yaml

# Deploy databases first
echo -e "${YELLOW}🗄️  Deploying databases...${NC}"
kubectl apply -f ${K8S_DIR}/05-postgres.yaml
kubectl apply -f ${K8S_DIR}/06-redis.yaml

# Wait for databases to be ready
echo -e "${YELLOW}⏳ Waiting for databases to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/postgres -n ${NAMESPACE}
kubectl wait --for=condition=available --timeout=300s deployment/redis -n ${NAMESPACE}

# Deploy application
echo -e "${YELLOW}🚀 Deploying application...${NC}"
kubectl apply -f ${K8S_DIR}/07-backend.yaml
kubectl apply -f ${K8S_DIR}/08-frontend.yaml

# Wait for application to be ready
echo -e "${YELLOW}⏳ Waiting for application to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/backend -n ${NAMESPACE}
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n ${NAMESPACE}

# Apply ingress
echo -e "${YELLOW}🌐 Setting up ingress...${NC}"
kubectl apply -f ${K8S_DIR}/09-ingress.yaml

# Show deployment status
echo -e "${BLUE}📊 Deployment Status:${NC}"
kubectl get all -n ${NAMESPACE}

# Get service URLs
echo -e "${BLUE}🌐 Service Information:${NC}"
kubectl get svc -n ${NAMESPACE}

# Get ingress info
if kubectl get ingress -n ${NAMESPACE} &> /dev/null; then
    echo -e "${BLUE}🌍 Ingress Information:${NC}"
    kubectl get ingress -n ${NAMESPACE}
fi

echo -e "${GREEN}✅ Kubernetes deployment completed!${NC}"
echo -e "${BLUE}💡 Useful commands:${NC}"
echo -e "   View pods:        kubectl get pods -n ${NAMESPACE}"
echo -e "   View logs:        kubectl logs -f deployment/backend -n ${NAMESPACE}"
echo -e "   Port forward:     kubectl port-forward svc/frontend-service 8080:80 -n ${NAMESPACE}"
echo -e "   Delete deployment: kubectl delete namespace ${NAMESPACE}"

echo -e "${GREEN}🎉 Crypto Exchange is now running on Kubernetes!${NC}"