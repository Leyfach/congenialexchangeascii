# Production Deployment Guide

## Pre-deployment Checklist

### Security
- [ ] All debug logs removed from production code
- [ ] Environment variables configured (.env files)
- [ ] HTTPS/SSL certificates configured
- [ ] Rate limiting properly configured
- [ ] Security headers enabled
- [ ] CORS restricted to production domains
- [ ] Database connection secured
- [ ] API keys and secrets properly managed

### Performance
- [ ] Frontend assets minified and optimized
- [ ] Database indexes created for performance
- [ ] Caching strategy implemented
- [ ] CDN configured for static assets
- [ ] Load balancing configured (if needed)

### Monitoring
- [ ] Application logging configured
- [ ] Error tracking setup (e.g., Sentry)
- [ ] Performance monitoring
- [ ] Health check endpoints
- [ ] Backup strategy implemented

## Docker Deployment

### Build Images
```bash
# Build backend
docker build -t crypto-exchange-backend ./backend

# Build frontend  
docker build -t crypto-exchange-frontend ./frontend
```

### Run with Docker Compose
```bash
docker-compose up -d
```

## Kubernetes Deployment

### Apply Manifests
```bash
kubectl apply -f k8s/
```

### Monitor Deployment
```bash
kubectl get pods -n crypto-exchange
kubectl logs -f deployment/backend -n crypto-exchange
```

## Environment Variables

### Backend (.env)
```
NODE_ENV=production
PORT=3000
JWT_SECRET=<strong-secret>
DATABASE_URL=<database-connection-string>
REDIS_URL=<redis-connection-string>
```

### Frontend
```
VITE_API_URL=https://api.yourexchange.com
VITE_WS_URL=wss://api.yourexchange.com
```

## Security Configuration

### Reverse Proxy (Nginx)
```nginx
server {
    listen 443 ssl http2;
    server_name yourexchange.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Database Migration

Before deployment, ensure database schema is up to date:
```bash
node backend/database/migration.js
```

## Post-deployment Verification

1. Check application health endpoints
2. Verify SSL certificate
3. Test API endpoints
4. Monitor logs for errors
5. Check real-time WebSocket connections
6. Verify trading functionality
7. Test security features (rate limiting, etc.)