#!/bin/bash

# Start development environment
set -e

echo "🛠️  Starting Crypto Exchange Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}📝 Please edit .env with your configuration${NC}"
fi

# Start only the databases for development
echo -e "${YELLOW}🗄️  Starting databases...${NC}"
docker-compose up -d postgres redis

echo -e "${YELLOW}⏳ Waiting for databases to start...${NC}"
sleep 5

# Check database connection
echo -e "${BLUE}🔍 Checking database connection...${NC}"
until docker-compose exec postgres pg_isready -U postgres; do
    echo -e "${YELLOW}⏳ Waiting for PostgreSQL...${NC}"
    sleep 2
done

until docker-compose exec redis redis-cli ping; do
    echo -e "${YELLOW}⏳ Waiting for Redis...${NC}"
    sleep 2
done

echo -e "${GREEN}✅ Databases are ready!${NC}"

# Instructions for manual startup
echo -e "${BLUE}💡 Development Setup Complete!${NC}"
echo -e "${YELLOW}🚀 To start the application in development mode:${NC}"
echo -e ""
echo -e "   ${BLUE}Backend:${NC}"
echo -e "     cd backend"
echo -e "     npm install"
echo -e "     npm run dev"
echo -e ""
echo -e "   ${BLUE}Frontend:${NC}"
echo -e "     cd frontend"
echo -e "     npm install"  
echo -e "     npm run dev"
echo -e ""
echo -e "${GREEN}🌐 URLs:${NC}"
echo -e "   Frontend: http://localhost:5173"
echo -e "   Backend:  http://localhost:3000"
echo -e "   Database: localhost:5432"
echo -e "   Redis:    localhost:6379"

echo -e "${GREEN}🎉 Development environment ready!${NC}"