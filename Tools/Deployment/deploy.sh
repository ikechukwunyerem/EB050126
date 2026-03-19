#!/bin/bash
# deploy.sh — run from WSL2 to push code and restart services
# Usage: ./deploy.sh <server-ip>
# Example: ./deploy.sh 54.123.45.67

set -e

SERVER_IP="${1:?Usage: ./deploy.sh <server-ip>}"
KEY="$HOME/efiko-key.pem"
BACKEND_LOCAL="./backend"      # adjust to your local backend path
FRONTEND_LOCAL="./frontend"    # adjust to your local frontend path

echo "→ Building React frontend..."
cd "$FRONTEND_LOCAL"
npm run build
cd -

echo "→ Pushing backend to server..."
rsync -avz --progress \
  --exclude='.git' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.env' \
  --exclude='venv' \
  --exclude='media' \
  -e "ssh -i $KEY" \
  "$BACKEND_LOCAL/" "ubuntu@$SERVER_IP:/var/www/efiko/backend/"

echo "→ Pushing frontend build to server..."
rsync -avz --progress \
  --delete \
  -e "ssh -i $KEY" \
  "$FRONTEND_LOCAL/dist/" "ubuntu@$SERVER_IP:/var/www/efiko/frontend/"

echo "→ Running migrations and restarting services..."
ssh -i "$KEY" "ubuntu@$SERVER_IP" << 'REMOTE'
  set -e
  cd /var/www/efiko/backend
  source venv/bin/activate
  pip install -r requirements.txt -q
  python manage.py migrate --noinput
  python manage.py collectstatic --noinput
  sudo systemctl restart efiko-gunicorn
  sudo systemctl restart efiko-celery
  sudo systemctl restart efiko-celerybeat
  echo "✓ All services restarted"
REMOTE

echo ""
echo "✓ Deployment complete!"
