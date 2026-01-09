# 🚀 AMC ERP - Quick Deployment Guide

## ✅ What's Been Completed

1. ✅ Merged `mvp-erp` branch to `main`
2. ✅ Created Docker configuration
3. ✅ Set up GitHub Container Registry publishing
4. ✅ Created automated CI/CD pipeline
5. ✅ Created VPS deployment scripts

## 📋 Next Steps

### 1. Push to GitHub

```bash
git push origin main
```

This will trigger the GitHub Actions workflow to automatically build and publish your Docker image to GHCR.

### 2. Configure GitHub Package Settings

After the first workflow run:
1. Go to your GitHub repository
2. Navigate to Packages (right sidebar)
3. Find `amc-erp` package
4. Click on it and go to "Package settings"
5. Make the package public (or manage access for private)

### 3. Deploy to VPS

#### Option A: One-Command Deployment
```bash
ssh user@your-vps-ip
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/deploy-vps.sh | bash
```

#### Option B: Manual Deployment
```bash
# SSH into your VPS
ssh user@your-vps-ip

# Pull and run the container
docker pull ghcr.io/fl-smartech/amc-erp:latest
docker run -d --name amc-erp-app -p 80:80 --restart unless-stopped ghcr.io/fl-smartech/amc-erp:latest
```

## 🔑 Required Credentials

### GitHub Personal Access Token
Create a token with `write:packages` scope:
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token
3. Select `write:packages` and `read:packages` scopes
4. Copy the token

### Login to GHCR (for manual builds)
```bash
docker login ghcr.io -u YOUR_GITHUB_USERNAME -p YOUR_TOKEN
```

## 🛠️ Common Commands

### Build and Publish (Windows)
```cmd
build-and-publish.bat
build-and-publish.bat v1.0.0
```

### Build and Publish (Linux/Mac)
```bash
chmod +x build-and-publish.sh
./build-and-publish.sh
./build-and-publish.sh v1.0.0
```

### Deploy to VPS
```bash
chmod +x deploy-vps.sh
./deploy-vps.sh
```

### Update Running App on VPS
```bash
chmod +x update-vps.sh
./update-vps.sh
```

### View Logs
```bash
docker logs -f amc-erp-app
```

### Restart App
```bash
docker restart amc-erp-app
```

## 🌐 Access Your App

After deployment, access your app at:
- `http://YOUR_VPS_IP`
- `http://YOUR_DOMAIN.com` (if DNS is configured)

## 📝 Important Files

- `Dockerfile` - Docker image definition
- `docker-compose.yml` - Docker Compose configuration
- `nginx.conf` - Nginx web server configuration
- `.dockerignore` - Files to exclude from Docker build
- `build-and-publish.sh/.bat` - Build and publish scripts
- `deploy-vps.sh` - VPS deployment script
- `update-vps.sh` - Update script for running apps
- `.github/workflows/docker-publish.yml` - CI/CD pipeline
- `DOCKER.md` - Comprehensive Docker documentation

## 🔐 Security Checklist

- [ ] Set up HTTPS/SSL certificate (use Let's Encrypt)
- [ ] Configure firewall (UFW on Ubuntu)
- [ ] Set up regular backups
- [ ] Configure monitoring (optional)
- [ ] Use environment variables for secrets
- [ ] Regularly update Docker images

## 🆘 Troubleshooting

### Port 80 already in use
```bash
# Use a different port
docker run -d --name amc-erp-app -p 8080:80 ghcr.io/fl-smartech/amc-erp:latest
```

### Can't pull from GHCR
```bash
# Make sure package is public or you're authenticated
docker login ghcr.io
```

### Container keeps restarting
```bash
# Check logs for errors
docker logs amc-erp-app
```

## 📚 Full Documentation

See `DOCKER.md` for comprehensive documentation including:
- Detailed deployment steps
- Security best practices
- Monitoring and troubleshooting
- Multi-environment setup
- Custom configurations

## 🎯 Production Checklist

Before going to production:
- [ ] Environment variables configured
- [ ] HTTPS/SSL enabled
- [ ] Domain name configured
- [ ] Database backups scheduled
- [ ] Monitoring set up
- [ ] Error logging configured
- [ ] Resource limits set
- [ ] Security headers configured
- [ ] Firewall rules applied
- [ ] Documentation updated

---

**Need Help?** Refer to `DOCKER.md` for detailed instructions or contact FL Smartech support.
