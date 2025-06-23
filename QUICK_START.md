# Quick Start Guide - Recrutas

## 🚀 Deploy to Production in 5 Minutes

### Option 1: Vercel (Recommended for YC Demo)

1. **Fork this repository** on GitHub
2. **Sign up at vercel.com** and connect your GitHub account
3. **Import your fork** and configure environment variables:
   ```
   DATABASE_URL=postgresql://your-database-url
   OPENAI_API_KEY=sk-your-openai-key
   SESSION_SECRET=your-32-character-secret
   ```
4. **Deploy** - Vercel will automatically build and deploy

### Option 2: Railway (Full-Stack with Database)

1. **Sign up at railway.app**
2. **Connect GitHub** and select your repository
3. **Add PostgreSQL service** to your project
4. **Configure environment variables** from Railway dashboard
5. **Deploy** with automatic CI/CD

### Option 3: Local Development

```bash
# Clone repository
git clone https://github.com/yourusername/recrutas.git
cd recrutas

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database and API keys

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

## 🗃 Database Setup

### Supabase (Free PostgreSQL)
1. Create account at supabase.com
2. Create new project
3. Copy connection string to `DATABASE_URL`
4. Run migrations: `npm run db:push`

### Local PostgreSQL
```bash
# Install PostgreSQL
# Create database
createdb recrutas

# Update .env
DATABASE_URL=postgresql://username:password@localhost:5432/recrutas
```

## 🔑 Required Environment Variables

```env
# Database (Required)
DATABASE_URL=postgresql://...

# AI Features (Required)
OPENAI_API_KEY=sk-...

# Security (Required)
SESSION_SECRET=your-32-character-secret

# Domain Configuration
REPLIT_DOMAINS=your-domain.com

# Optional: Email & Payments
SENDGRID_API_KEY=SG...
STRIPE_SECRET_KEY=sk_...
```

## 📊 Demo Data

```bash
# Populate with sample data for YC demo
npm run seed:demo
```

## 🔍 Key Features to Demo

1. **AI Job Matching** - Visit candidate dashboard
2. **Custom Exams** - Create job posting with exam
3. **Merit-Based Chat** - Take exam, qualify for chat
4. **Real-Time Jobs** - See live job aggregation
5. **Hiring Dashboard** - View candidate rankings

## 🎯 YC Demo URLs

- **Main App**: your-app.vercel.app
- **GitHub**: github.com/yourusername/recrutas
- **Documentation**: Same repository, comprehensive README

## 📞 Support

- Documentation: README.md
- Issues: GitHub Issues
- Security: security@recrutas.com