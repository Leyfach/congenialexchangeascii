# Crypto Exchange Deployment Guide

This guide covers deployment options for the Crypto Exchange platform using Docker and Kubernetes.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Kubernetes cluster (for K8s deployment)
- kubectl configured

### Development Environment

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd exchange
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start development environment:**
   ```bash
   ./scripts/dev-start.sh
   ```

3. **Start applications manually:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm install
   npm run dev

   # Terminal 2 - Frontend  
   cd frontend
   npm install
   npm run dev
   ```

## 🐳 Docker Deployment

### Single Command Deployment
```bash
./scripts/deploy-docker.sh
```

### Manual Docker Deployment
```bash
# Build images
./scripts/build-images.sh

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### Services
- **Frontend**: http://localhost (port 80)
- **Backend API**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379  
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090

## ☸️ Kubernetes Deployment

### Single Command Deployment
```bash
./scripts/deploy-k8s.sh [image-tag]
```

### Manual Kubernetes Deployment
```bash
# Build images
./scripts/build-images.sh

# Apply manifests
kubectl apply -f k8s/

# Check deployment
kubectl get all -n crypto-exchange
```

### Accessing Services

**Port Forward (Development):**
```bash
# Frontend
kubectl port-forward svc/frontend-service 8080:80 -n crypto-exchange

# Backend
kubectl port-forward svc/backend-service 8080:3000 -n crypto-exchange
```

**Production (with Ingress):**
- Configure DNS: `crypto-exchange.example.com`
- Update `k8s/09-ingress.yaml` with your domain
- Install nginx-ingress controller
- Install cert-manager for SSL

## 🔧 Configuration

### Environment Variables

**Required:**
```env
# Database
POSTGRES_PASSWORD=secure_password_change_me
REDIS_PASSWORD=redis_password_change_me

# Security
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-encryption-key-32-chars

# External APIs
COINGECKO_API_KEY=your_api_key_here
```

**Optional:**
```env
NODE_ENV=production
DOMAIN=localhost
SSL_ENABLED=false
GRAFANA_PASSWORD=admin123
```

### Secrets Management

**Docker:**
- Use `.env` file (not committed to git)
- Mount secrets as files for production

**Kubernetes:**
```bash
# Update secrets
kubectl create secret generic exchange-secrets \
  --from-literal=JWT_SECRET=your-secret \
  --from-literal=ENCRYPTION_KEY=your-key \
  -n crypto-exchange --dry-run=client -o yaml | kubectl apply -f -
```

## 📊 Monitoring

### Built-in Monitoring Stack

**Grafana Dashboard:** http://localhost:3001
- Username: admin  
- Password: admin123 (change in production)

**Prometheus Metrics:** http://localhost:9090

### Key Metrics
- API response times
- Database connections  
- Redis cache hit rates
- Trading volume
- Active users
- Error rates

## 🔒 Security Considerations

### Production Checklist
- [ ] Change all default passwords
- [ ] Use proper SSL certificates
- [ ] Enable database encryption
- [ ] Setup firewall rules
- [ ] Regular security updates
- [ ] Backup strategy
- [ ] Log monitoring
- [ ] Rate limiting configuration

### Network Security
- Database/Redis not exposed externally
- API rate limiting enabled
- CORS properly configured
- Security headers implemented
- Input validation and sanitization

## 🧹 Cleanup

### Remove Docker Deployment
```bash
./scripts/cleanup.sh docker
```

### Remove Kubernetes Deployment  
```bash
./scripts/cleanup.sh k8s
```

### Complete Cleanup
```bash
./scripts/cleanup.sh all
```

## 📝 Troubleshooting

### Common Issues

**Database Connection Failed:**
```bash
# Check database status
docker-compose logs postgres
kubectl logs deployment/postgres -n crypto-exchange

# Test connection
docker-compose exec postgres pg_isready -U postgres
```

**Redis Connection Failed:**
```bash
# Check Redis
docker-compose logs redis
kubectl logs deployment/redis -n crypto-exchange

# Test connection
docker-compose exec redis redis-cli ping
```

**Build Issues:**
```bash
# Clean build
docker system prune -f
docker-compose build --no-cache

# Check Docker space
docker system df
```

**Kubernetes Issues:**
```bash
# Check pods
kubectl get pods -n crypto-exchange
kubectl describe pod <pod-name> -n crypto-exchange

# Check events
kubectl get events -n crypto-exchange --sort-by=.metadata.creationTimestamp
```

### Logs

**Docker:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

**Kubernetes:**
```bash
# Application logs
kubectl logs -f deployment/backend -n crypto-exchange
kubectl logs -f deployment/frontend -n crypto-exchange

# Database logs
kubectl logs -f deployment/postgres -n crypto-exchange
```

## 🚀 Scaling

### Docker Scaling
```bash
# Scale backend
docker-compose up -d --scale backend=3

# With load balancer needed for multiple frontend instances
```

### Kubernetes Auto-scaling
- HPA configured for CPU/Memory based scaling
- Backend: 2-10 replicas
- Frontend: 2-5 replicas  
- Databases: Single instance (consider clustering for production)

### Manual Kubernetes Scaling
```bash
# Scale backend
kubectl scale deployment backend --replicas=5 -n crypto-exchange

# Scale frontend  
kubectl scale deployment frontend --replicas=3 -n crypto-exchange
```

## 📋 Maintenance

### Updates
```bash
# Build new version
./scripts/build-images.sh v1.1.0

# Rolling update (K8s)
kubectl set image deployment/backend backend=crypto-exchange/backend:v1.1.0 -n crypto-exchange
```

### Backups
```bash
# Database backup (Docker)
docker-compose exec postgres pg_dump -U postgres crypto_exchange > backup.sql

# Database backup (K8s)
kubectl exec deployment/postgres -n crypto-exchange -- pg_dump -U postgres crypto_exchange > backup.sql
```

### Health Checks
```bash
# Check API health
curl http://localhost/api/markets
curl http://localhost:3000/api/markets

# Database health  
docker-compose exec postgres pg_isready -U postgres
kubectl exec deployment/postgres -n crypto-exchange -- pg_isready -U postgres
```

## 🎯 Performance Tuning

### Database Optimization
- Connection pooling configured
- Proper indexes on frequently queried fields
- Regular VACUUM and ANALYZE

### Caching Strategy
- Redis for API response caching
- Application-level caching for static data
- CDN for static assets (production)

### Resource Limits
- Backend: 256Mi-1Gi memory, 200m-500m CPU
- Frontend: 64Mi-256Mi memory, 50m-200m CPU
- Database: Adjust based on usage patterns

---

🎉 **Crypto Exchange is now ready for production deployment!**

For support, check the troubleshooting section or contact the development team.