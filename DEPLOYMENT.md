# 🚀 Production Deployment Guide

This guide explains how to deploy the Smart Assistant Chatbot to a production server.

## 📋 Prerequisites

- **Docker** and **Docker Compose** installed
- A domain name (e.g., `chat.yourdomain.com`)
- SSL certificate (optional but recommended)
- At least 2GB RAM on your server

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        NGINX (Port 80/443)                  │
│                    Reverse Proxy + SSL + Rate Limiting      │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌─────────┐     ┌─────────┐     ┌─────────────┐
        │ Client  │     │ Server  │     │ PostgreSQL  │
        │ (Next)  │     │ (API)   │     │ (Database)  │
        │ :3000   │     │ :4000   │     │ :5432       │
        └─────────┘     └─────────┘     └─────────────┘
```

## 🔧 Quick Start (Local Docker)

### 1. Clone and Setup

```bash
cd /path/to/Chatbot_ML

# Copy environment template
cp .env.production.example .env

# Edit .env with your values
nano .env
```

### 2. Configure Environment Variables

Edit `.env` file with your actual values:

```env
# Required
GEMINI_API_KEY=your_actual_gemini_api_key

# Database (change for production!)
DB_USER=chatbot_user
DB_PASSWORD=your_very_secure_password_123!
DB_NAME=chatbot_db

# Frontend URL (set to your domain in production)
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Build and Run

```bash
# Build all containers
docker-compose build

# Start the application
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health

---

## 🌐 Production Deployment (Cloud Server)

### Option 1: VPS (DigitalOcean, AWS EC2, Linode)

#### Step 1: Server Setup

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Create app directory
mkdir -p /opt/chatbot
cd /opt/chatbot
```

#### Step 2: Transfer Files

```bash
# From your local machine
scp -r /path/to/Chatbot_ML/* root@your-server-ip:/opt/chatbot/
```

#### Step 3: SSL Setup with Let's Encrypt (Recommended)

```bash
# Install Certbot
apt install certbot -y

# Get SSL certificate
certbot certonly --standalone -d your-domain.com

# Copy certificates
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/chatbot/nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/chatbot/nginx/ssl/

# Update nginx.conf to use HTTPS (uncomment SSL section)
```

#### Step 4: Configure for Production

```bash
# Edit environment
nano .env

# Update these values:
# FRONTEND_URL=https://your-domain.com
# NEXT_PUBLIC_API_URL=https://your-domain.com
```

#### Step 5: Deploy

```bash
# Build and start
docker-compose build
docker-compose up -d

# Check status
docker-compose ps
```

---

### Option 2: Railway (Easy Cloud Deployment)

1. Create account at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Add PostgreSQL plugin
4. Set environment variables in Railway dashboard
5. Deploy!

---

### Option 3: Vercel + Railway Split

**Frontend (Vercel):**
1. Push `client/` folder to a GitHub repo
2. Connect to Vercel
3. Set `NEXT_PUBLIC_API_URL` to your Railway backend URL

**Backend (Railway):**
1. Push `server/` folder to a GitHub repo
2. Connect to Railway
3. Add PostgreSQL database
4. Set environment variables

---

## 🔒 Security Checklist

- [ ] Change default database password
- [ ] Set strong `SESSION_SECRET`
- [ ] Enable HTTPS with SSL certificate
- [ ] Configure firewall (only allow 80, 443)
- [ ] Rotate Gemini API keys periodically
- [ ] Enable automatic security updates
- [ ] Set up log monitoring

---

## 📊 Monitoring & Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f postgres

# Check container status
docker-compose ps

# Monitor resources
docker stats
```

---

## 🔄 Updating the Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Check if postgres is running
docker-compose ps postgres

# View postgres logs
docker-compose logs postgres

# Connect to database manually
docker exec -it chatbot_db psql -U chatbot_user -d chatbot_db
```

### Frontend Not Loading
```bash
# Check Next.js logs
docker-compose logs client

# Verify build succeeded
docker-compose build client --no-cache
```

### API Errors
```bash
# Check server logs
docker-compose logs server

# Test health endpoint
curl http://localhost:4000/health
```

---

## 📱 Custom Domain Setup

1. **Register a domain** (e.g., Namecheap, GoDaddy)
2. **Update DNS records**:
   - A Record: `@` → Your server IP
   - CNAME: `www` → `@`
3. **Get SSL certificate** (Let's Encrypt - free!)
4. **Update Nginx config** with your domain
5. **Update .env** with your domain URL

---

## 💡 Performance Tips

1. **Enable CDN** (Cloudflare - free tier available)
2. **Use Redis** for session caching (advanced)
3. **Scale horizontally** with Docker Swarm/Kubernetes
4. **Monitor** with services like Datadog or New Relic

---

## 🎉 You're Live!

Once deployed, your chatbot will be accessible at:
- `https://your-domain.com` (Frontend)
- `https://your-domain.com/api/*` (API endpoints)
- `https://your-domain.com/health` (Health check)

Just like `gemini.google.com/saved-info`! 🚀
