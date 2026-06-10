# VPS Deployment Guide - Sherif Platform

## Overview
Complete guide for deploying Sherif platform on a VPS with PostgreSQL database.

---

## Part 1: VPS Setup

### 1.1 Prerequisites
- VPS with Ubuntu 20.04+ or similar Linux distribution
- Root or sudo access
- Domain name (optional but recommended)

### 1.2 Install System Dependencies

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (v18 or higher)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx (for reverse proxy)
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

### 1.3 Create Application User

```bash
# Create non-root user for app
sudo useradd -m -s /bin/bash sherif
sudo usermod -aG sudo sherif

# Switch to new user
sudo su - sherif
```

---

## Part 2: Database Setup

### 2.1 PostgreSQL Configuration

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE sherif_db;
CREATE USER sherif_user WITH PASSWORD 'your-secure-password-here';
ALTER ROLE sherif_user SET client_encoding TO 'utf8';
ALTER ROLE sherif_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE sherif_user SET default_transaction_deferrable TO on;
ALTER ROLE sherif_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE sherif_db TO sherif_user;
\c sherif_db
GRANT ALL PRIVILEGES ON SCHEMA public TO sherif_user;
EOF
```

### 2.2 Verify Database Connection

```bash
# Test connection
psql -U sherif_user -d sherif_db -h localhost
# Type: \q to exit
```

---

## Part 3: Application Deployment

### 3.1 Clone Repository

```bash
cd /home/sherif
git clone <your-repo-url> sherif-app
cd sherif-app
```

### 3.2 Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
# Database
DATABASE_URL=postgresql://sherif_user:your-secure-password-here@localhost:5432/sherif_db?schema=public

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Server
PORT=4000
FRONTEND_URL=https://yourdomain.com

# Feature Flags
MOCK_PAYMENTS=false
MOCK_PROVIDER=false

# Admin Credentials (Change in production)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourSecurePassword123

# Demo Agent Credentials
DEMO_AGENT_EMAIL=agent@yourdomain.com
DEMO_AGENT_PASSWORD=AgentPassword123

# Paystack Integration
PAYSTACK_PUBLIC_KEY=pk_live_your_live_public_key
PAYSTACK_SECRET_KEY=sk_live_your_live_secret_key

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key-here
EOF
```

### 3.3 Run Database Migrations

```bash
# Run migrations using migration files
npx prisma migrate deploy

# If you need to create migrations from scratch:
# npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed database (optional)
npx prisma db seed
```

### 3.4 Build Backend

```bash
# Build TypeScript
npm run build

# Verify build
ls -la dist/
```

### 3.5 Seed Database (AUTOMATIC - No Action Needed)

✅ Seeding is **automatic** when the server starts for the first time!

The server (`server.ts`) automatically checks if the database has users:
- **If empty** → seeds admin + demo agent + 10 products + networks
- **If not empty** → skips seeding

The seeding uses your environment variables:
- `ADMIN_EMAIL` + `ADMIN_PASSWORD` for admin account
- `DEMO_AGENT_EMAIL` + `DEMO_AGENT_PASSWORD` for demo agent

To verify seeding worked, check server logs:
```bash
pm2 logs sherif-backend
# You should see: "[startup-seed] Seed complete. Admin and demo agent created."
```

If you need to reset data later:
```bash
npx prisma migrate reset --force
pm2 restart sherif-backend
```

### 3.5 Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_NAME=DATAHUB Ghana
EOF

# Build frontend
npm run build

# Verify build
ls -la .next/
```

---

## Part 4: Process Management with PM2

### 4.1 Start Backend with PM2

```bash
cd /home/sherif/sherif-app/backend

# Start backend
pm2 start npm --name "sherif-backend" -- start

# Start frontend (if using Node.js server)
cd ../frontend
pm2 start npm --name "sherif-frontend" -- start

# Save PM2 configuration
pm2 save

# Enable PM2 startup on reboot
pm2 startup
# Follow the instructions provided
```

### 4.2 Monitor Processes

```bash
# View all processes
pm2 list

# View logs
pm2 logs sherif-backend
pm2 logs sherif-frontend

# Monitor in real-time
pm2 monit
```

---

## Part 5: Nginx Configuration

### 5.1 Create Nginx Configuration

```bash
sudo cat > /etc/nginx/sites-available/sherif << 'EOF'
upstream backend {
    server localhost:4000;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API routes
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
```

### 5.2 Enable Nginx Configuration

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/sherif /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 5.3 Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Part 6: Database Backups

### 6.1 Create Backup Script

```bash
cat > /home/sherif/backup-db.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/sherif/backups"
DB_NAME="sherif_db"
DB_USER="sherif_user"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/sherif_db_$TIMESTAMP.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "sherif_db_*.sql.gz" -mtime +7 -delete

echo "Backup created: $BACKUP_FILE"
EOF

chmod +x /home/sherif/backup-db.sh
```

### 6.2 Schedule Daily Backups

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * /home/sherif/backup-db.sh
```

---

## Part 7: Monitoring & Maintenance

### 7.1 System Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Monitor system
htop

# Monitor disk usage
df -h

# Monitor database size
sudo -u postgres psql -d sherif_db -c "SELECT pg_size_pretty(pg_database_size('sherif_db'));"
```

### 7.2 Log Rotation

```bash
# Create logrotate configuration
sudo cat > /etc/logrotate.d/sherif << EOF
/home/sherif/sherif-app/backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 sherif sherif
    sharedscripts
}
EOF
```

### 7.3 Health Checks

```bash
# Create health check script
cat > /home/sherif/health-check.sh << 'EOF'
#!/bin/bash

# Check backend
curl -s http://localhost:4000/health || echo "Backend down!"

# Check frontend
curl -s http://localhost:3000 > /dev/null || echo "Frontend down!"

# Check database
sudo -u postgres psql -d sherif_db -c "SELECT 1;" > /dev/null || echo "Database down!"

echo "Health check completed at $(date)"
EOF

chmod +x /home/sherif/health-check.sh

# Schedule health checks
crontab -e
# Add: */5 * * * * /home/sherif/health-check.sh
```

---

## Part 8: Deployment Checklist

### Pre-Deployment
- [ ] VPS provisioned and accessible
- [ ] Domain name configured
- [ ] SSH keys set up
- [ ] Node.js and PostgreSQL installed
- [ ] Firewall configured (allow ports 22, 80, 443)

### Database
- [ ] PostgreSQL installed and running
- [ ] Database created
- [ ] Database user created with secure password
- [ ] Migrations applied successfully
- [ ] Seed data loaded (optional)

### Application
- [ ] Repository cloned
- [ ] .env files created with production values
- [ ] Dependencies installed
- [ ] Build completed successfully
- [ ] PM2 processes started and monitored

### Web Server
- [ ] Nginx installed and configured
- [ ] SSL certificate installed
- [ ] Reverse proxy working
- [ ] Static file caching configured

### Monitoring
- [ ] PM2 configured for auto-restart
- [ ] Backup script scheduled
- [ ] Health checks configured
- [ ] Log rotation set up

---

## Part 9: Production Environment Variables

Update these in your `.env` file:

```bash
# Database (use your actual credentials)
DATABASE_URL=postgresql://sherif_user:secure-password@localhost:5432/sherif_db?schema=public

# JWT (generate a strong random string)
JWT_SECRET=generate-a-long-random-string-here-min-32-chars

# Server
PORT=4000
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production

# Feature Flags
MOCK_PAYMENTS=false
MOCK_PROVIDER=false

# Admin Credentials (change these!)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=ChangeThisSecurePassword123

# Paystack (get from Paystack dashboard)
PAYSTACK_PUBLIC_KEY=pk_live_your_actual_key
PAYSTACK_SECRET_KEY=sk_live_your_actual_key

# Encryption (generate 32-character random string)
ENCRYPTION_KEY=generate-32-character-random-string

# Optional: Redis (if using caching)
REDIS_URL=redis://localhost:6379
```

---

## Part 10: Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs sherif-backend

# Check port is available
lsof -i :4000

# Check database connection
psql -U sherif_user -d sherif_db -h localhost
```

### Database connection failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check credentials
sudo -u postgres psql -l

# Check firewall
sudo ufw status
```

### Nginx not working
```bash
# Test configuration
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log

# Check if running
sudo systemctl status nginx
```

### SSL certificate issues
```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run

# Check renewal logs
sudo journalctl -u certbot.timer -n 50
```

---

## Part 11: Updating Application

```bash
# Pull latest changes
cd /home/sherif/sherif-app
git pull origin main

# Backend update
cd backend
npm install
npx prisma migrate deploy
npm run build
pm2 restart sherif-backend

# Frontend update
cd ../frontend
npm install
npm run build
pm2 restart sherif-frontend
```

---

## Part 12: Security Hardening

### Firewall Configuration
```bash
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### SSH Hardening
```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Change these settings:
# Port 22 -> Port 2222 (optional)
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes

# Restart SSH
sudo systemctl restart ssh
```

### Database Security
```bash
# Restrict PostgreSQL to localhost
sudo nano /etc/postgresql/*/main/postgresql.conf
# Set: listen_addresses = 'localhost'

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Support & Documentation

- **Prisma Docs**: https://www.prisma.io/docs/
- **Next.js Docs**: https://nextjs.org/docs
- **Express Docs**: https://expressjs.com/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **PM2 Docs**: https://pm2.keymetrics.io/docs/

---

**Last Updated**: June 10, 2026
**Status**: Ready for VPS Deployment
