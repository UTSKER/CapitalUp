#!/bin/bash

echo "========================================="
echo "   CapitalUp Deployment Script"
echo "========================================="

# Step 1: Install Docker
echo "[1/5] Installing Docker & Docker Compose..."
sudo apt update -y
sudo apt install -y docker.io docker-compose unzip
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

# Step 2: Check .env exists
echo "[2/5] Checking .env file..."
if [ ! -f "./capitalup-backend/.env" ]; then
  echo "ERROR: .env file not found in capitalup-backend/"
  echo "Please create it first: cp capitalup-backend/.env.example capitalup-backend/.env"
  echo "Then edit it: nano capitalup-backend/.env"
  exit 1
fi

# Step 3: Build and start containers
echo "[3/5] Building and starting all containers..."
sudo docker-compose down --remove-orphans
sudo docker-compose up -d --build

# Step 4: Wait and check status
echo "[4/5] Waiting for containers to start..."
sleep 10
sudo docker ps

# Step 5: Done
echo "[5/5] Deployment complete!"
echo ""
echo "Frontend: http://3.108.227.217"
echo "Backend:  http://3.108.227.217:3000"
echo ""
echo "To check logs:"
echo "  sudo docker-compose logs -f backend"
echo "  sudo docker-compose logs -f frontend"
