# Efiko — AWS Deployment Guide
## Single EC2 t3.small · Ubuntu 22.04 · ~$17/mo

---

## Architecture Overview

```
Internet → EC2 (Nginx) → Gunicorn (Django)
                       → React static files
                       → PostgreSQL (local)
                       → Redis (local)
                       → Celery worker (systemd)
User uploads → S3
```

---

## PART 1 — AWS Setup (Console)

### 1.1 Launch EC2 Instance

1. Go to **EC2 → Launch Instance**
2. Name: `efiko-production`
3. AMI: **Ubuntu Server 22.04 LTS (HVM), SSD Volume Type**
4. Instance type: **t3.small**
5. Key pair: Create new → name `efiko-key` → download `efiko-key.pem` → keep it safe
6. Network settings → **Allow SSH, HTTP, HTTPS** from anywhere (0.0.0.0/0)
7. Storage: **20 GB gp3**
8. Launch instance

### 1.2 Allocate an Elastic IP

1. EC2 → **Elastic IPs → Allocate Elastic IP address → Allocate**
2. Select it → **Actions → Associate Elastic IP address**
3. Choose your `efiko-production` instance → Associate
4. Note the IP address — you'll use it throughout this guide

### 1.3 Point your domain to the Elastic IP

At your domain registrar, add two DNS A records:

```
Type  Host              Value
A     efiko.com         <your-elastic-ip>
A     www.efiko.com     <your-elastic-ip>
```

DNS propagation takes 5–30 minutes. Continue with the rest of the guide while waiting.

### 1.4 Create S3 Bucket for media

1. Go to **S3 → Create bucket**
2. Name: `efiko-media` (must be globally unique — try `efiko-media-prod`)
3. Region: same region as your EC2 (e.g. `eu-west-1`)
4. **Uncheck** "Block all public access" → acknowledge
5. Create bucket

Then set a bucket policy to allow public read of media files:
- Select bucket → **Permissions → Bucket Policy → Edit**
- Paste this (replace `efiko-media-prod` with your bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::efiko-media-prod/*"
    }
  ]
}
```

### 1.5 Create IAM user for S3 access

1. Go to **IAM → Users → Create user**
2. Name: `efiko-s3-user`
3. Permissions → **Attach policies directly** → search and select `AmazonS3FullAccess`
4. Create user → click the user → **Security credentials → Create access key**
5. Use case: **Application running outside AWS**
6. Note down the **Access Key ID** and **Secret Access Key** — shown only once

---

## PART 2 — Server Setup

### 2.1 Connect to your EC2 instance

From WSL2:

```bash
# Move key to WSL home and fix permissions
cp /mnt/c/Users/<YourWindowsUser>/Downloads/efiko-key.pem ~/
chmod 400 ~/efiko-key.pem

# Connect
ssh -i ~/efiko-key.pem ubuntu@<your-elastic-ip>
```

All commands from here run **on the server** unless stated otherwise.

### 2.2 System update and essential packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y \
  python3-pip python3-venv python3-dev \
  postgresql postgresql-contrib \
  nginx \
  redis-server \
  git \
  curl \
  certbot python3-certbot-nginx \
  build-essential libpq-dev \
  supervisor
```

### 2.3 Install Node.js 20 (for building the React frontend)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # should print v20.x.x
```

---

## PART 3 — PostgreSQL Setup

```bash
sudo -u postgres psql << SQL
CREATE DATABASE efiko;
CREATE USER efikouser WITH PASSWORD 'choose-a-strong-password-here';
ALTER ROLE efikouser SET client_encoding TO 'utf8';
ALTER ROLE efikouser SET default_transaction_isolation TO 'read committed';
ALTER ROLE efikouser SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE efiko TO efikouser;
\q
SQL
```

---

## PART 4 — Redis Setup

Redis is already installed. Enable and start it:

```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping   # should return PONG
```

---

## PART 5 — Deploy the Django Backend

### 5.1 Create app user and directories

```bash
sudo adduser --system --group --no-create-home efiko
sudo mkdir -p /var/www/efiko/backend
sudo mkdir -p /var/www/efiko/frontend
sudo mkdir -p /var/log/efiko
sudo chown -R ubuntu:ubuntu /var/www/efiko
sudo chown -R ubuntu:ubuntu /var/log/efiko
```

### 5.2 Upload backend code from WSL2

**On your WSL2 machine** (not the server), from your Django project root:

```bash
# Replace <your-elastic-ip> with your actual IP
rsync -avz --exclude='.git' --exclude='__pycache__' \
  --exclude='*.pyc' --exclude='.env' --exclude='venv' \
  -e "ssh -i ~/efiko-key.pem" \
  ./ ubuntu@<your-elastic-ip>:/var/www/efiko/backend/
```

### 5.3 Set up Python virtual environment

**Back on the server:**

```bash
cd /var/www/efiko/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn boto3 django-storages
```

### 5.4 Install django-storages for S3

Add to your `requirements.txt` (or install now):

```bash
pip install boto3 django-storages
```

### 5.5 Create the production .env file

```bash
nano /var/www/efiko/backend/.env
```

Paste and fill in every value:

```env
# Django
DJANGO_SECRET_KEY=generate-a-long-random-string-here
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=efiko.com,www.efiko.com,<your-elastic-ip>

# Database
DB_NAME=efiko
DB_USER=efikouser
DB_PASSWORD=choose-a-strong-password-here
DB_HOST=127.0.0.1
DB_PORT=5432

# Redis
CELERY_BROKER_URL=redis://127.0.0.1:6379/0
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0
REDIS_URL=redis://127.0.0.1:6379/1

# AWS S3 (media files)
AWS_ACCESS_KEY_ID=<your-iam-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-iam-secret-access-key>
AWS_STORAGE_BUCKET_NAME=efiko-media-prod
AWS_S3_REGION_NAME=eu-west-1

# Email (update when ready for production)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=Efiko <noreply@efiko.com>

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>

# Paystack
PAYSTACK_SECRET_KEY=<your-paystack-secret-key>
PAYSTACK_PUBLIC_KEY=<your-paystack-public-key>

# App
FRONTEND_URL=https://efiko.com
CORS_ALLOWED_ORIGINS=https://efiko.com,https://www.efiko.com
```

To generate a secure Django secret key:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

### 5.6 Add S3 storage settings to Django settings.py

Add this block to the **bottom** of your `core/settings.py`:

```python
# --- S3 Media Storage (production only) ---
import os as _os
if not DEBUG:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_ACCESS_KEY_ID     = _os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = _os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = _os.getenv('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME    = _os.getenv('AWS_S3_REGION_NAME', 'eu-west-1')
    AWS_S3_FILE_OVERWRITE = False
    AWS_DEFAULT_ACL       = None
    AWS_S3_CUSTOM_DOMAIN  = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    MEDIA_URL             = f'https://{AWS_S3_CUSTOM_DOMAIN}/'
```

After editing `settings.py` locally, re-run the rsync from Step 5.2 to push the change.

### 5.7 Run Django setup commands

```bash
cd /var/www/efiko/backend
source venv/bin/activate

python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser   # follow the prompts
```

### 5.8 Test Gunicorn manually

```bash
cd /var/www/efiko/backend
source venv/bin/activate
gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers 3
```

You should see `Listening at: http://0.0.0.0:8000`. Press `Ctrl+C` to stop.

---

## PART 6 — Gunicorn systemd Service

```bash
sudo nano /etc/systemd/system/efiko-gunicorn.service
```

Paste:

```ini
[Unit]
Description=Efiko Gunicorn daemon
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/var/www/efiko/backend
EnvironmentFile=/var/www/efiko/backend/.env
ExecStart=/var/www/efiko/backend/venv/bin/gunicorn \
    core.wsgi:application \
    --bind unix:/run/efiko-gunicorn.sock \
    --workers 3 \
    --timeout 120 \
    --access-logfile /var/log/efiko/gunicorn-access.log \
    --error-logfile /var/log/efiko/gunicorn-error.log
ExecReload=/bin/kill -s HUP $MAINPID
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable efiko-gunicorn
sudo systemctl start efiko-gunicorn
sudo systemctl status efiko-gunicorn   # should show "active (running)"
```

---

## PART 7 — Celery systemd Service

```bash
sudo nano /etc/systemd/system/efiko-celery.service
```

Paste:

```ini
[Unit]
Description=Efiko Celery Worker
After=network.target redis.service

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/var/www/efiko/backend
EnvironmentFile=/var/www/efiko/backend/.env
ExecStart=/var/www/efiko/backend/venv/bin/celery \
    -A core worker \
    --loglevel=info \
    --logfile=/var/log/efiko/celery-worker.log
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo nano /etc/systemd/system/efiko-celerybeat.service
```

Paste:

```ini
[Unit]
Description=Efiko Celery Beat Scheduler
After=network.target redis.service

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/var/www/efiko/backend
EnvironmentFile=/var/www/efiko/backend/.env
ExecStart=/var/www/efiko/backend/venv/bin/celery \
    -A core beat \
    --loglevel=info \
    --logfile=/var/log/efiko/celery-beat.log \
    --scheduler django_celery_beat.schedulers:DatabaseScheduler
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable both:

```bash
sudo systemctl daemon-reload
sudo systemctl enable efiko-celery efiko-celerybeat
sudo systemctl start efiko-celery efiko-celerybeat
sudo systemctl status efiko-celery    # should be active
sudo systemctl status efiko-celerybeat
```

---

## PART 8 — Build and Deploy React Frontend

**On your WSL2 machine**, in your React project root:

```bash
# Create production .env
cat > .env.production << EOF
VITE_API_BASE_URL=https://efiko.com/api
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
EOF

# Build
npm run build
# This creates a dist/ folder with your compiled app

# Upload dist/ to server
rsync -avz -e "ssh -i ~/efiko-key.pem" \
  dist/ ubuntu@<your-elastic-ip>:/var/www/efiko/frontend/
```

---

## PART 9 — Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/efiko
```

Paste (replace `efiko.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name efiko.com www.efiko.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # React frontend — serve static files directly
    location / {
        root /var/www/efiko/frontend;
        index index.html;
        # Required for React Router — always serve index.html for unknown paths
        try_files $uri $uri/ /index.html;
    }

    # Django API
    location /api/ {
        proxy_pass         http://unix:/run/efiko-gunicorn.sock;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 20M;
    }

    # Django admin
    location /admin/ {
        proxy_pass         http://unix:/run/efiko-gunicorn.sock;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # Django static files (admin CSS/JS)
    location /static/ {
        alias /var/www/efiko/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Increase upload size for profile images and resources
    client_max_body_size 20M;
}
```

Enable the site and test:

```bash
sudo ln -s /etc/nginx/sites-available/efiko /etc/nginx/sites-enabled/
sudo nginx -t    # must print "syntax is ok" and "test is successful"
sudo systemctl restart nginx
```

---

## PART 10 — SSL Certificate (HTTPS)

Wait until your DNS has propagated (check with `ping efiko.com` — should resolve to your EC2 IP), then:

```bash
sudo certbot --nginx -d efiko.com -d www.efiko.com
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose **Redirect** (option 2) — forces all HTTP to HTTPS

Certbot automatically edits your Nginx config and sets up auto-renewal. Test renewal works:

```bash
sudo certbot renew --dry-run
```

---

## PART 11 — Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status   # should show SSH, 80, 443 allowed
```

---

## PART 12 — Verify Everything Works

```bash
# All services running?
sudo systemctl status efiko-gunicorn
sudo systemctl status efiko-celery
sudo systemctl status efiko-celerybeat
sudo systemctl status nginx
sudo systemctl status redis-server
sudo systemctl status postgresql

# Test API responds
curl https://efiko.com/api/resources/

# Check logs if anything is wrong
sudo journalctl -u efiko-gunicorn -n 50
tail -f /var/log/efiko/gunicorn-error.log
tail -f /var/log/nginx/error.log
```

---

## PART 13 — Ongoing Deployments

Every time you push code changes, run this from WSL2:

```bash
# 1. Push backend changes
rsync -avz --exclude='.git' --exclude='__pycache__' \
  --exclude='*.pyc' --exclude='.env' --exclude='venv' \
  -e "ssh -i ~/efiko-key.pem" \
  /path/to/backend/ ubuntu@<your-elastic-ip>:/var/www/efiko/backend/

# 2. SSH in and run migrations + restart
ssh -i ~/efiko-key.pem ubuntu@<your-elastic-ip> << 'REMOTE'
  cd /var/www/efiko/backend
  source venv/bin/activate
  pip install -r requirements.txt   # picks up any new packages
  python manage.py migrate
  python manage.py collectstatic --noinput
  sudo systemctl restart efiko-gunicorn
  sudo systemctl restart efiko-celery
  sudo systemctl restart efiko-celerybeat
REMOTE

# 3. Rebuild and push frontend
cd /path/to/frontend
npm run build
rsync -avz -e "ssh -i ~/efiko-key.pem" \
  dist/ ubuntu@<your-elastic-ip>:/var/www/efiko/frontend/
# No Nginx restart needed — static files are served directly
```

---

## PART 14 — Google OAuth Production Setup

Your Google OAuth will fail in production unless you add the production domain to Google Cloud Console:

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. APIs & Services → Credentials → your OAuth 2.0 Client ID → Edit
3. **Authorised JavaScript origins** → Add:
   - `https://efiko.com`
   - `https://www.efiko.com`
4. **Authorised redirect URIs** → Add:
   - `https://efiko.com`
   - `https://www.efiko.com`
5. Save

---

## Troubleshooting Quick Reference

| Symptom | Check |
|---------|-------|
| 502 Bad Gateway | `sudo systemctl status efiko-gunicorn` — Gunicorn not running |
| Static files 404 | `python manage.py collectstatic` not run, or wrong `alias` path in Nginx |
| API returns 500 | `tail -f /var/log/efiko/gunicorn-error.log` |
| Celery tasks not running | `sudo systemctl status efiko-celery` + check Redis is up |
| Media uploads fail | Check AWS IAM key and S3 bucket policy |
| Google OAuth 401 | Ensure production domain added to Google Cloud Console (Part 14) |
| SSL cert not renewing | `sudo certbot renew --dry-run` to test |

