#!/bin/bash

# Setup script for Ollama + Recrutas Resume Parser
# This script starts Ollama and pulls the Mistral model

echo "🚀 Setting up Ollama for Recrutas Resume Parser"
echo "================================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed."
    exit 1
fi

echo "✅ Docker found"

# Start Ollama container
echo ""
echo "Starting Ollama container..."
docker-compose -f docker-compose.ollama.yml up -d

# Wait for Ollama to start
echo "⏳ Waiting for Ollama to be ready..."
sleep 5

# Check if Ollama is running
if ! curl -s http://localhost:11434 > /dev/null 2>&1; then
    echo "⏳ Still waiting for Ollama..."
    sleep 5
fi

if curl -s http://localhost:11434 > /dev/null 2>&1; then
    echo "✅ Ollama is running"
else
    echo "⚠️  Ollama container started but not responding yet. It may take a moment to initialize."
fi

# Pull Mistral model
echo ""
echo "📥 Pulling Mistral model (this may take 5-10 minutes on first run)..."
docker exec recrutas-ollama ollama pull mistral

echo ""
echo "✅ Ollama setup complete!"
echo ""
echo "📝 Configuration:"
echo "   OLLAMA_URL=http://localhost:11434"
echo "   OLLAMA_MODEL=mistral"
echo ""
echo "🚀 You can now start the Recrutas app:"
echo "   npm run dev"
echo ""
echo "To stop Ollama:"
echo "   docker-compose -f docker-compose.ollama.yml down"
