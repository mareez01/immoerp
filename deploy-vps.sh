#!/bin/bash

# AMC ERP - VPS Deployment Script
# This script deploys the AMC ERP application on a VPS using Docker

set -e

# Configuration
REGISTRY="ghcr.io"
OWNER="fl-smartech"
IMAGE_NAME="amc-erp"
VERSION="${1:-latest}"
CONTAINER_NAME="amc-erp-app"
PORT="${2:-80}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}AMC ERP - VPS Deployment${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}Docker installed successfully${NC}"
    echo -e "${YELLOW}Please log out and log back in for group changes to take effect${NC}"
    exit 0
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo -e "${YELLOW}Docker Compose not found. Installing...${NC}"
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}Docker Compose installed successfully${NC}"
fi

# Full image name
FULL_IMAGE_NAME="${REGISTRY}/${OWNER}/${IMAGE_NAME}:${VERSION}"

echo -e "${YELLOW}Deployment Configuration:${NC}"
echo "  Image: ${FULL_IMAGE_NAME}"
echo "  Container: ${CONTAINER_NAME}"
echo "  Port: ${PORT}"
echo ""

# Stop and remove existing container if it exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${YELLOW}Stopping existing container...${NC}"
    docker stop "${CONTAINER_NAME}" || true
    echo -e "${YELLOW}Removing existing container...${NC}"
    docker rm "${CONTAINER_NAME}" || true
fi

# Pull the latest image
echo -e "${YELLOW}Pulling latest image...${NC}"
docker pull "${FULL_IMAGE_NAME}"

# Run the container
echo -e "${YELLOW}Starting new container...${NC}"
docker run -d \
    --name "${CONTAINER_NAME}" \
    --restart unless-stopped \
    -p "${PORT}:80" \
    --health-cmd "wget --quiet --tries=1 --spider http://localhost/ || exit 1" \
    --health-interval 30s \
    --health-timeout 3s \
    --health-retries 3 \
    --health-start-period 5s \
    "${FULL_IMAGE_NAME}"

# Wait for container to be healthy
echo -e "${YELLOW}Waiting for container to be healthy...${NC}"
sleep 5

# Check container status
if docker ps --filter "name=${CONTAINER_NAME}" --filter "status=running" | grep -q "${CONTAINER_NAME}"; then
    echo ""
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo ""
    echo -e "${GREEN}Application is running at:${NC}"
    echo "  http://$(curl -s ifconfig.me):${PORT}"
    echo "  http://localhost:${PORT} (from VPS)"
    echo ""
    echo -e "${BLUE}Container Status:${NC}"
    docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  View logs:       docker logs ${CONTAINER_NAME}"
    echo "  Follow logs:     docker logs -f ${CONTAINER_NAME}"
    echo "  Stop app:        docker stop ${CONTAINER_NAME}"
    echo "  Start app:       docker start ${CONTAINER_NAME}"
    echo "  Restart app:     docker restart ${CONTAINER_NAME}"
    echo "  Remove app:      docker rm -f ${CONTAINER_NAME}"
    echo ""
else
    echo -e "${RED}Deployment failed!${NC}"
    echo -e "${YELLOW}Container logs:${NC}"
    docker logs "${CONTAINER_NAME}"
    exit 1
fi

# Cleanup old images
echo -e "${YELLOW}Cleaning up old images...${NC}"
docker image prune -f

echo -e "${GREEN}Deployment complete!${NC}"
