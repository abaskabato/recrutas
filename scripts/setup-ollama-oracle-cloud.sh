#!/bin/bash
# setup-ollama-oracle-cloud.sh
# Setup Ollama on Oracle Cloud Free Tier (Always Free)
# Run this on your Oracle Cloud VM after SSHing in

set -e

echo "🚀 Setting up Ollama on Oracle Cloud..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Ollama
echo "📦 Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

# Create systemd service for Ollama
echo "⚙️ Creating Ollama service..."
sudo tee /etc/systemd/system/ollama.service > /dev/null <<EOF
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ubuntu
Group=ubuntu
Restart=always
RestartSec=3
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

[Install]
WantedBy=default.target
EOF

# Enable and start Ollama
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama

# Wait for Ollama to start
sleep 5

# Pull models (use smaller/faster models for job extraction)
echo "🧠 Pulling AI models..."
ollama pull llama3.2:1b  # Fastest, good enough for job extraction
ollama pull llama3.2     # Better quality, slower

# Test Ollama
echo "🧪 Testing Ollama..."
curl -s http://localhost:11434/api/tags | jq -r '.models[].name'

echo "✅ Ollama setup complete!"
echo ""
echo "📊 Models installed:"
ollama list

echo ""
echo "🔧 Next steps:"
echo "1. Set up Cloudflare Tunnel (see setup-cloudflare-tunnel.sh)"
echo "2. Update GitHub Actions with your Ollama URL"
echo ""
echo "📍 Local Ollama URL: http://localhost:11434"
