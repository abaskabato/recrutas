#!/bin/bash
# One-command Ollama setup for Oracle Cloud
# Run this ON YOUR ORACLE VM after SSHing in

set -e

echo "🚀 Installing Ollama on Oracle Cloud..."

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start server in background
nohup ollama serve > /dev/null 2>&1 &
sleep 5

# Pull fast model
echo "📥 Pulling llama3.2:1b model..."
ollama pull llama3.2:1b

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me)

echo ""
echo "✅ Ollama is ready!"
echo ""
echo "📍 Your Ollama URL:"
echo "   http://${PUBLIC_IP}:11434"
echo ""
echo "📋 Next step - Add to GitHub:"
echo "   gh secret set OLLAMA_URL --body \"http://${PUBLIC_IP}:11434\""
echo ""
echo "🧪 Test locally:"
echo "   curl http://localhost:11434/api/tags"
