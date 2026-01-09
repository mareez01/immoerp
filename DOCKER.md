# AMC ERP - Docker Deployment Guide

## 📦 Quick Start

### Prerequisites
- Docker 20.10+
- Docker Compose (optional)
- GitHub account (for GHCR)

## 🚀 Building and Publishing

### 1. Login to GitHub Container Registry

```bash
# Create a Personal Access Token with write:packages scope
# Go to: GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)

# Login to GHCR
docker login ghcr.io -u YOUR_GITHUB_USERNAME -p YOUR_TOKEN
```

### 2. Build and Publish (Automated)

#### On Linux/Mac:
```bash
chmod +x build-and-publish.sh
./build-and-publish.sh           # Builds and pushes as 'latest'
./build-and-publish.sh v1.0.0    # Builds and pushes with version tag
```

#### On Windows:
```cmd
build-and-publish.bat           # Builds and pushes as 'latest'
build-and-publish.bat v1.0.0    # Builds and pushes with version tag
```

### 3. Build Manually

```bash
# Build the image
docker build -t ghcr.io/fl-smartech/amc-erp:latest .

# Push to registry
docker push ghcr.io/fl-smartech/amc-erp:latest
```

## 🖥️ VPS Deployment

### One-Command Deployment

```bash
# Download and run deployment script
curl -fsSL https://raw.githubusercontent.com/fl-smartech/amc-erp/main/deploy-vps.sh | bash

# Or if you have the script locally
chmod +x deploy-vps.sh
./deploy-vps.sh           # Deploy latest version
./deploy-vps.sh v1.0.0    # Deploy specific version
```

### Manual VPS Deployment

```bash
# Pull the image
docker pull ghcr.io/fl-smartech/amc-erp:latest

# Run the container
docker run -d \
  --name amc-erp-app \
  --restart unless-stopped \
  -p 80:80 \
  ghcr.io/fl-smartech/amc-erp:latest
```

### Using Docker Compose

```bash
# Start the application
docker-compose up -d

# Stop the application
docker-compose down

# Update and restart
docker-compose pull
docker-compose up -d
```

## 🔄 Updating the Application

### Automated Update

```bash
chmod +x update-vps.sh
./update-vps.sh           # Update to latest
./update-vps.sh v1.0.0    # Update to specific version
```

### Manual Update

```bash
# Pull latest image
docker pull ghcr.io/fl-smartech/amc-erp:latest

# Stop and remove old container
docker stop amc-erp-app
docker rm amc-erp-app

# Run new container
docker run -d \
  --name amc-erp-app \
  --restart unless-stopped \
  -p 80:80 \
  ghcr.io/fl-smartech/amc-erp:latest

# Clean up old images
docker image prune -f
```

## 🛠️ Management Commands

### View Logs
```bash
# View recent logs
docker logs amc-erp-app

# Follow logs in real-time
docker logs -f amc-erp-app

# View last 100 lines
docker logs --tail 100 amc-erp-app
```

### Container Management
```bash
# Check status
docker ps -a | grep amc-erp

# Stop container
docker stop amc-erp-app

# Start container
docker start amc-erp-app

# Restart container
docker restart amc-erp-app

# Remove container
docker rm -f amc-erp-app
```

### System Cleanup
```bash
# Remove unused images
docker image prune -f

# Remove all unused resources
docker system prune -af

# See disk usage
docker system df
```

## 🔒 Security Considerations

### 1. Use HTTPS (Recommended for Production)

Set up a reverse proxy with SSL:

```bash
# Using Nginx Proxy Manager (recommended)
docker run -d \
  --name nginx-proxy-manager \
  -p 80:80 \
  -p 443:443 \
  -p 81:81 \
  jc21/nginx-proxy-manager:latest
```

Or use Caddy for automatic HTTPS:

```bash
docker run -d \
  --name caddy \
  -p 80:80 \
  -p 443:443 \
  -v caddy_data:/data \
  -v caddy_config:/config \
  caddy caddy reverse-proxy --from yourdomain.com --to amc-erp-app:80
```

### 2. Environment Variables

Create a `.env` file for sensitive data (not committed to git):

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key
```

Run with env file:
```bash
docker run -d \
  --name amc-erp-app \
  --env-file .env \
  -p 80:80 \
  ghcr.io/fl-smartech/amc-erp:latest
```

## 🔄 GitHub Actions (CI/CD)

The repository includes a GitHub Actions workflow that automatically:
- Builds the Docker image on every push to main
- Publishes to GitHub Container Registry
- Tags images based on git tags
- Supports multi-platform builds (amd64, arm64)

To enable:
1. Go to repository Settings > Actions > General
2. Enable "Read and write permissions" for GITHUB_TOKEN
3. Push to main branch or create a git tag

## 📊 Monitoring

### Health Check

The container includes a health check:
```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' amc-erp-app

# View health check logs
docker inspect --format='{{json .State.Health}}' amc-erp-app | jq
```

### Resource Usage

```bash
# Monitor real-time stats
docker stats amc-erp-app

# Check container size
docker ps -s
```

## 🐛 Troubleshooting

### Container won't start
```bash
# Check logs for errors
docker logs amc-erp-app

# Check if port is already in use
netstat -tlnp | grep :80

# Try running on different port
docker run -d --name amc-erp-app -p 8080:80 ghcr.io/fl-smartech/amc-erp:latest
```

### Image pull fails
```bash
# Re-authenticate
docker login ghcr.io

# Pull with explicit tag
docker pull ghcr.io/fl-smartech/amc-erp:latest

# Check network connectivity
ping ghcr.io
```

### Application not accessible
```bash
# Check if container is running
docker ps | grep amc-erp

# Check nginx logs inside container
docker exec amc-erp-app cat /var/log/nginx/error.log

# Test from inside container
docker exec amc-erp-app wget -O- http://localhost
```

## 📝 Configuration

### Custom Nginx Configuration

Mount custom nginx.conf:
```bash
docker run -d \
  --name amc-erp-app \
  -p 80:80 \
  -v $(pwd)/custom-nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  ghcr.io/fl-smartech/amc-erp:latest
```

### Custom Port

```bash
# Run on port 8080
docker run -d \
  --name amc-erp-app \
  -p 8080:80 \
  ghcr.io/fl-smartech/amc-erp:latest
```

## 🌐 Multi-Environment Setup

### Development
```bash
docker run -d --name amc-erp-dev -p 3000:80 ghcr.io/fl-smartech/amc-erp:dev
```

### Staging
```bash
docker run -d --name amc-erp-staging -p 8080:80 ghcr.io/fl-smartech/amc-erp:staging
```

### Production
```bash
docker run -d --name amc-erp-prod -p 80:80 --restart always ghcr.io/fl-smartech/amc-erp:latest
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Nginx Documentation](https://nginx.org/en/docs/)

## 💡 Tips

1. **Always use specific version tags in production** instead of `latest`
2. **Set up automated backups** of your data
3. **Monitor container logs** regularly
4. **Keep Docker and images updated**
5. **Use secrets management** for sensitive data
6. **Set resource limits** for containers in production
7. **Enable logging to external services** for better observability

## 📧 Support

For issues or questions, please open an issue on GitHub or contact FL Smartech support.
