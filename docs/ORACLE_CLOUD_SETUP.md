# Oracle Cloud Free Tier Setup for Recrutas Ollama

## Step 1: Create Oracle Cloud Account

1. Go to: **https://www.oracle.com/cloud/free/**
2. Click **"Start for free"**
3. Sign up with email (no credit card needed for always-free)
4. Verify email

---

## Step 2: Create Always Free Compute Instance

1. After login, go to **Oracle Cloud Console**
2. Click hamburger menu → **Compute** → **Instances**
3. Click **"Create Instance"**

**Configuration:**
- **Name:** `ollama-recrutas`
- **Image:** Ubuntu 22.04 LTS (default)
- **Shape:** 
  - Click "Change Shape"
  - Select **ARM** → **VM.Standard.A1.Flex**
  - **OCPUs:** 2
  - **Memory:** 12 GB
- **Networking:** 
  - Select existing VCN or create new
  - Check "Assign a public IP address"
- **SSH Keys:** 
  - Click "Save Private Key" or add your existing pub key
  - Download the private key if generated

4. Click **"Create"**

---

## Step 3: Connect to Your VM

```bash
# SSH into your instance (use the IP from Oracle Console)
ssh -i /path/to/private_key ubuntu@YOUR_INSTANCE_PUBLIC_IP
```

---

## Step 4: Install Ollama

Run this on your Oracle VM:

```bash
# Update and install dependencies
sudo apt update && sudo apt upgrade -y

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama in background
ollama serve &

# Wait a moment, then pull model
sleep 5
ollama pull llama3.2:1b

# Test it works
curl http://localhost:11434/api/tags
```

---

## Step 5: Get Your Ollama URL

```bash
# Check your VM's public IP
curl ifconfig.me
```

Your Ollama URL will be: `http://YOUR_VM_IP:11434`

---

## Step 6: Add to GitHub Secrets

```bash
# Set the Ollama URL as a GitHub secret
gh secret set OLLAMA_URL --body "http://YOUR_VM_IP:11434"
```

---

## Step 7: Run the Scraper

```bash
gh workflow run scrape-tech-companies.yml
```

---

## Expected Performance

| Metric | GitHub Actions Ollama | Oracle Cloud Ollama |
|--------|----------------------|---------------------|
| **Setup time** | ~3 min (install + download) | 0 (pre-installed) |
| **Model load** | ~30 seconds each run | Instant |
| **Per company** | ~60 seconds | ~10 seconds |
| **Total time** | 100+ minutes | ~10-15 minutes |
| **Rate limits** | None | None |

---

## Troubleshooting

### Ollama not starting?
```bash
# Check status
systemctl status ollama

# Or run manually
ollama serve
```

### Can't connect from GitHub?
```bash
# Check firewall
sudo ufw status
sudo ufw allow 11434/tcp
```

### Model too slow?
```bash
# Use even smaller model
ollama pull llama3.2:1b
```

---

## Cost: $0/month forever

Oracle Always Free includes:
- 2 ARM-based VMs (4 cores, 24GB RAM total)
- 200GB block storage
- Unlimited bandwidth

Your VM will run 24/7 at no cost.
