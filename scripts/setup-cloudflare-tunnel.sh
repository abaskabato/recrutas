#!/bin/bash
# setup-cloudflare-tunnel.sh
# Expose Ollama securely via Cloudflare Tunnel (free)
# Run this on your Oracle Cloud VM

set -e

echo "🌐 Setting up Cloudflare Tunnel..."

# Install cloudflared
echo "📦 Installing cloudflared..."
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Login to Cloudflare (will give you URL to authenticate)
echo "🔑 Login to Cloudflare..."
echo "A URL will open in your browser. Copy the token and paste it here."
cloudflared tunnel login

# Create tunnel
echo "🚇 Creating tunnel..."
TUNNEL_NAME="ollama-recrutas"
cloudflared tunnel create $TUNNEL_NAME

# Get tunnel credentials file location
CREDS_FILE=$(ls ~/.cloudflared/*.json | head -1)
TUNNEL_ID=$(basename $CREDS_FILE .json)

echo "Tunnel ID: $TUNNEL_ID"

# Create config file
sudo tee /etc/cloudflared/config.yml > /dev/null <<EOF
tunnel: $TUNNEL_ID
credentials-file: /home/ubuntu/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: ollama-recrutas.yourdomain.com
    service: http://localhost:11434
  - service: http_status:404
EOF

# Copy credentials to /etc/cloudflared
sudo cp $CREDS_FILE /etc/cloudflared/
sudo chown -R root:root /etc/cloudflared

# Install as service
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# Route DNS (you'll need to do this manually in Cloudflare dashboard)
echo ""
echo "⚠️  IMPORTANT: Create DNS record in Cloudflare Dashboard"
echo ""
echo "1. Go to https://dash.cloudflare.com/"
echo "2. Select your domain"
echo "3. Go to DNS settings"
echo "4. Add CNAME record:"
echo "   Name: ollama-recrutas"
echo "   Target: $TUNNEL_ID.cfargotunnel.com"
echo "   Proxy status: Enabled (orange cloud)"
echo ""
echo "📍 Your Ollama will be available at: https://ollama-recrutas.yourdomain.com"
echo ""
echo "🧪 Test it:"
echo "curl https://ollama-recrutas.yourdomain.com/api/tags"

# Create update script for GitHub Actions
cat << 'INSTRUCTIONS'

═══════════════════════════════════════════════════════════
NEXT STEPS:
═══════════════════════════════════════════════════════════

1. In GitHub repo, add these secrets:
   - OLLAMA_URL: https://ollama-recrutas.yourdomain.com
   - USE_OLLAMA: true
   - DATABASE_URL: (your existing secret)
   - GROQ_API_KEY: (keep as backup)

2. Update .github/workflows/scrape-tech-companies.yml
   to use your Ollama instance (remove install/start steps)

3. Test scraping - it should be 10x faster now!

═══════════════════════════════════════════════════════════
INSTRUCTIONS
