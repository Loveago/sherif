# VPS Deployment Guide — Sherif / CheapDataPacks Ghana (Copy & Paste Ready)

This guide walks you through deploying the **entire Sherif application** (backend + frontend) on a **single VPS** under your own domain. You'll also host **PostgreSQL** directly on the VPS (not a cloud DB).

**Architecture**:
- Backend Node.js/Express (TypeScript) → runs on port 4000 via PM2
- Frontend Next.js 15 (App Router) → runs on port 3000 via PM2
- PostgreSQL → runs locally on the VPS
- Nginx → reverse proxies API calls to backend, proxies all other traffic to Next.js, handles SSL

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Initial VPS Setup](#step-1-initial-vps-setup)
3. [Step 2: DNS Configuration](#step-2-dns-configuration)
4. [Step 3: Install Dependencies](#step-3-install-dependencies)
5. [Step 4: PostgreSQL Setup](#step-4-postgresql-setup)
6. [Step 5: Deploy Backend](#step-5-deploy-backend)
7. [Step 6: Build & Deploy Frontend (Next.js)](#step-6-build--deploy-frontend-nextjs)
8. [Step 7: Nginx Configuration](#step-7-nginx-configuration)
9. [Step 8: Enable HTTPS with Certbot (SSL)](#step-8-enable-https-with-certbot-ssl)
10. [Step 9: Maintenance & Updates](#step-9-maintenance--updates)
11. [Troubleshooting](#troubleshooting)

---

### Prerequisites

- VPS with **Ubuntu 22.04** (or 24.04) — any provider (DigitalOcean, Linode, Hetzner, Vultr, etc.)
- SSH access as a **non-root user with sudo privileges**
- A domain name (e.g., `datahubgh.com`) with DNS access
- Your project code in a **Git repository** (GitHub, GitLab, etc.)
- At least **1GB RAM** (2GB recommended)

---

### Step 1: Initial VPS Setup

```bash
# 1. SSH into your VPS
ssh your_user@your_vps_ip

# 2. Update all system packages
sudo apt update && sudo apt upgrade -y

# 3. Install essential tools
sudo apt install -y curl wget git ufw

# 4. Configure firewall — allow SSH, HTTP, and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 5. Verify firewall is active
sudo ufw status
```

---

### Step 2: DNS Configuration

In your domain registrar's DNS panel, create these **A records**:

| Type | Hostname | Value            |
|------|----------|------------------|
| A    | @        | `your_vps_ip`    |
| A    | www      | `your_vps_ip`    |

Wait **5–15 minutes** for DNS propagation. Verify with:

```bash
# Replace with your domain
ping datahubgh.com
```

---

### Step 3: Install Dependencies

Run these commands one after another:

```bash
# ---- Install Node.js v20 LTS ----
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # Should show v20.x
npm -v    # Should show 10.x

# ---- Install Nginx ----
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# ---- Install PM2 (process manager) ----
sudo npm install -g pm2

# ---- Install PostgreSQL ----
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Verify PostgreSQL is running
sudo systemctl status postgresql
```

---

### Step 4: PostgreSQL Setup

Your app database user will have **full privileges** on the application database. The database runs locally on the VPS.

```bash
# 1. Switch to the postgres system user
sudo -i -u postgres

# 2. Enter the PostgreSQL interactive terminal
psql
```

Inside the `psql` prompt, run these SQL commands **one at a time**:

```sql
-- Create a role for your app
CREATE USER sherif_user WITH PASSWORD 'YourSecurePasswordHere';

-- Grant privileges
ALTER USER sherif_user WITH CREATEDB;

-- Create the database owned by this user
CREATE DATABASE sherif_db OWNER sherif_user;

-- Grant schema privileges
\c sherif_db
GRANT ALL ON SCHEMA public TO sherif_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO sherif_user;

-- Exit PostgreSQL
\q
```

```bash
# 3. Exit the postgres system user
exit

# 4. Test the connection (you'll be prompted for the password)
psql -U sherif_user -d sherif_db -h localhost

# If it connects successfully, type \q to quit
```

**Security note**: Since PostgreSQL only listens on `localhost` (default), the user is only accessible from within the VPS — not exposed to the internet. This is safe.

---

### Step 5: Deploy Backend

```bash
# 1. Clone your repository
#    Replace with your actual repo URL
cd /var
sudo mkdir -p www
sudo chown $USER:$USER www
cd www
git clone https://github.com/your-username/your-repo.git sherif
cd sherif/backend

# 2. Install backend dependencies
npm install

# 3. Create environment file
#    (Use actual values from your local .env.production or create from scratch)
cat > .env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://datahubgh.com

# Database (PostgreSQL running on same VPS)
DATABASE_URL=postgresql://sherif_user:YourSecurePasswordHere@localhost:5432/sherif_db?schema=public

# JWT Secret — GENERATE YOUR OWN: run 'openssl rand -base64 32' on the VPS
JWT_SECRET=change-this-to-a-random-string-min-32-chars
JWT_EXPIRES_IN=7d

# Feature Flags (disable in production)
MOCK_PAYMENTS=false
MOCK_PROVIDER=false

# Admin Seed User — Created automatically on first startup
ADMIN_EMAIL=admin@datahubgh.com
ADMIN_PASSWORD=ChangeThisSecurePassword123

# Demo Agent Seed User — Created automatically on first startup
DEMO_AGENT_EMAIL=agent@datahubgh.com
DEMO_AGENT_PASSWORD=AgentPassword123

# Paystack Payment Gateway
# Get these from https://dashboard.paystack.com
PAYSTACK_PUBLIC_KEY=pk_live_your_public_key_here
PAYSTACK_SECRET_KEY=sk_live_your_secret_key_here

# Shank API (data provider)
SHANK_API_KEY=your_shank_api_key_here
SHANK_API_BASE_URL=https://agent.skanka5.com/api/v1
SHANK_WORKER_INTERVAL_MS=30000
EOF

# 4. IMPORTANT: Generate your own JWT secret
#    Run this command and replace the JWT_SECRET placeholder above:
openssl rand -base64 32

# 5. Build TypeScript
npm run build

# 6. Run database migrations (this creates all tables)
npx prisma migrate deploy

# 7. Generate Prisma client
npx prisma generate

# 8. Start backend with PM2
pm2 start npm --name "sherif-backend" -- start

# 9. Configure PM2 to auto-start on server reboot
pm2 startup
#   Copy-paste the command PM2 outputs (it will look something like:)
#   sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your_user --hp /home/your_user
pm2 save

# 10. Verify backend is running
pm2 status
#   Should show "sherif-backend" as "online"
curl http://localhost:4000/api/v1/health
#   Should return: {"success":true,"message":"DATAHUB Ghana API is healthy","data":{"status":"ok"}}
```

**Note**: The backend automatically seeds the admin and demo agent accounts on first startup using the credentials in your `.env` file. Check `pm2 logs sherif-backend` to confirm seeding completed.

---

### Step 6: Build & Deploy Frontend (Next.js)

```bash
# 1. Navigate to frontend directory
cd /var/www/sherif/frontend

# 2. Install dependencies
npm install

# 3. Create production environment file
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://datahubgh.com/api/v1
EOF

# 4. Build the Next.js app for production
npm run build

# 5. Verify the build was created
ls -la .next/
#   Should show: BUILD_ID, server/, static/, etc.

# 6. Start frontend with PM2
pm2 start npm --name "sherif-frontend" -- start

# 7. Save PM2 config
pm2 save

# 8. Verify frontend is running
pm2 status
#   Should show "sherif-frontend" as "online"
curl -I http://localhost:3000
#   Should return 200 OK
```

---

### Step 7: Nginx Configuration

**Critical**: The backend API is mounted at `/api/v1/*`. The Next.js frontend server runs on port 3000. Nginx must proxy `/api/v1/` to the backend and everything else to the frontend.

```bash
# 1. Create the Nginx site configuration
#    Replace 'datahubgh.com' with your actual domain
sudo nano /etc/nginx/sites-available/datahubgh.com
```

Paste the following configuration **exactly** (replace `datahubgh.com` with your domain):

```nginx
server {
    listen 80;
    server_name datahubgh.com www.datahubgh.com;

    # ──────────────────────────────────────────────
    # API PROXY — Route all API calls to the backend
    # ──────────────────────────────────────────────

    location /api/v1/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # ──────────────────────────────────────────────
    # FRONTEND — Proxy all other routes to Next.js
    # ──────────────────────────────────────────────

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Optional: Cache Next.js static assets
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_bypass $http_upgrade;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Save** (Ctrl+O, Enter) and **exit** (Ctrl+X).

Now activate the site:

```bash
# 2. Enable the site by creating a symlink
sudo ln -s /etc/nginx/sites-available/datahubgh.com /etc/nginx/sites-enabled/

# 3. Remove the default Nginx site (optional but recommended)
sudo rm /etc/nginx/sites-enabled/default

# 4. Test the Nginx configuration
sudo nginx -t
#   Should output: "test is successful"

# 5. Reload Nginx to apply changes
sudo systemctl reload nginx
```

**Test your deployment**:
```bash
# Check the frontend is being served
curl -I http://datahubgh.com
# Should return 200 OK

# Check the backend health endpoint through Nginx
curl http://datahubgh.com/api/v1/health
# Should return: {"success":true,"message":"DATAHUB Ghana API is healthy",...}
```

---

### Step 8: Enable HTTPS with Certbot (SSL)

```bash
# 1. Install Certbot and the Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# 2. Obtain SSL certificate (Certbot auto-configures Nginx)
#    Replace with your actual domain
sudo certbot --nginx -d datahubgh.com -d www.datahubgh.com

#    Follow the prompts:
#    - Enter your email (for renewal notices)
#    - Agree to Terms of Service
#    - Choose whether to redirect HTTP to HTTPS (select "2" — YES)

# 3. Verify auto-renewal is set up
sudo systemctl status certbot.timer

# 4. Test the renewal process (dry run)
sudo certbot renew --dry-run
```

Your site is now live at **`https://datahubgh.com`** 🎉

---

### Step 9: Maintenance & Updates

#### Update the application

```bash
cd /var/www/sherif

# Pull latest code
git pull origin main

# ---- Update Backend ----
cd backend
npm install
npm run build
npx prisma migrate deploy
npx prisma generate
pm2 restart sherif-backend

# ---- Update Frontend ----
cd ../frontend
npm install
npm run build
pm2 restart sherif-frontend

# Reload Nginx (just in case)
sudo systemctl reload nginx
```

#### Useful PM2 commands

```bash
pm2 status                          # List all processes
pm2 logs sherif-backend            # View backend logs
pm2 logs sherif-backend --lines 100  # Last 100 lines
pm2 logs sherif-frontend           # View frontend logs
pm2 monit                          # Monitor CPU/RAM usage
pm2 restart sherif-backend        # Restart backend
pm2 restart sherif-frontend       # Restart frontend
pm2 stop sherif-backend           # Stop backend
pm2 delete sherif-backend         # Remove from PM2
```

#### View backend logs in real-time

```bash
pm2 logs sherif-backend --lines 200
```

#### Database backup

```bash
# Backup the entire database
pg_dump -U sherif_user -h localhost sherif_db > /home/your_user/sherif_backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U sherif_user -h localhost -d sherif_db < /home/your_user/sherif_backup_20250101.sql
```

---

### Troubleshooting

#### Blank screen or "Failed to fetch" in browser

```bash
# Check if backend is running
pm2 status

# Check backend logs for errors
pm2 logs sherif-backend --lines 50

# Check if Nginx is proxying API correctly
curl -v http://localhost:4000/api/v1/health
# Should return JSON, NOT HTML

# Try through Nginx
curl -v http://datahubgh.com/api/v1/health
# Should also return JSON

# Check Nginx error logs
sudo tail -50 /var/log/nginx/error.log
```

#### Frontend 502 Bad Gateway

```bash
# Check if Next.js frontend is running
pm2 status

# Check frontend logs
pm2 logs sherif-frontend --lines 50

# Test frontend directly
curl -I http://localhost:3000
```

#### Database connection errors

```bash
# Test PostgreSQL connection
psql -U sherif_user -d sherif_db -h localhost

# Check if PostgreSQL is running
sudo systemctl status postgresql

# Verify the DATABASE_URL in .env matches your credentials
# Format: postgresql://USER:PASSWORD@localhost:5432/DBNAME?schema=public
```

#### Nginx configuration test

```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### Port 80/443 already in use

```bash
sudo lsof -i :80
sudo lsof -i :443
sudo systemctl stop apache2   # If Apache is using port 80
```

---

> **Your app is now fully deployed with:**
> - Self-hosted PostgreSQL database
> - Backend running on PM2 (auto-restarts on crash & reboot)
> - Next.js frontend running on PM2 (auto-restarts on crash & reboot)
> - Nginx reverse proxy routing `/api/v1/` to backend and everything else to Next.js
> - HTTPS with auto-renewing SSL certificate
