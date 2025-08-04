# Recrutas - Talk Directly to Companies

> Built on AI. Backed by transparency. Focused on you.

Skip the recruiters. Talk straight to the people who actually make hiring decisions.


[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

## 🚀 Key Features

### For Job Seekers
- **Talk to real people** - Chat directly with hiring managers, not recruiters
- **Prove your skills first** - Take job-specific tests to unlock conversations
- **See what's happening** - No more black hole applications - track everything in real-time
- **Get help with career gaps** - Smart suggestions for getting back on track
- **Find jobs instantly** - Fresh opportunities from 500+ companies

### For Hiring Managers
- **Filter candidates your way** - Create custom tests that actually matter
- **Skip the middleman** - Talk directly to people who passed your tests
- **Use tools you trust** - Connect HackerRank, Codility, or build your own
- **See the full picture** - Track every step of your hiring process
- **Let AI help rank** - Smart scoring to find the best candidates faster

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Authentication**: Better Auth with OAuth support
- **Real-time**: WebSocket for live chat and notifications
- **AI**: OpenAI GPT-4o for matching and analysis
- **Deployment**: Vercel, Railway, or Docker

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or hosted)
- OpenAI API key (for AI matching features)

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/yourusername/recrutas.git
cd recrutas
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
```

Fill in your environment variables:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/recrutas"

# Authentication
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:5000"

# AI Features (Optional)
OPENAI_API_KEY="your-openai-api-key"

# OAuth Providers (Optional)
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. Database Setup
```bash
# Push schema to database
npm run db:push

# Optional: View database in Drizzle Studio
npm run db:studio
```

### 4. Start Development
```bash
npm run dev
```

Visit `http://localhost:5000` to see your application running!

## 📁 Project Structure

```
recrutas/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configurations
├── server/                # Express backend
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Database operations
│   ├── auth.ts           # Authentication setup
│   └── services/         # Business logic services
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema and types
└── docs/                # Documentation
```

## 🔧 Configuration

### Database Configuration
The platform uses PostgreSQL with Drizzle ORM. Configure your database URL in the `.env` file.

### Authentication
Better Auth is configured for multiple OAuth providers:
- GitHub
- Google
- Microsoft (configurable)

### AI Features
OpenAI integration powers:
- Semantic job matching
- Resume analysis
- Application insights
- Career recommendations

## 🧪 Testing

```bash
# Run test suite
npm test

# Test specific features
node test-ai-matching.js
node test-exam-workflow.js
node test-transparency-system.js
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
vercel --prod
```

### Railway
```bash
railway login
railway init
railway up
```

### Docker
```bash
docker build -t recrutas .
docker run -p 5000:5000 recrutas
```



## 📊 Performance

- **AI Matching**: 87% accuracy in job-candidate compatibility
- **Real-time Updates**: <100ms WebSocket latency
- **Job Aggregation**: 500+ companies scraped in real-time
- **Database**: Optimized queries with connection pooling
- **Caching**: Redis integration for improved performance

## 🔐 Security

- JWT-based authentication with refresh tokens
- Rate limiting on all API endpoints
- Input validation with Zod schemas
- SQL injection protection with parameterized queries
- CORS configuration for secure cross-origin requests

## 📈 Roadmap

- [ ] Mobile application (React Native)
- [ ] Advanced analytics dashboard
- [ ] Integration with more ATS systems
- [ ] Machine learning model improvements
- [ ] Multi-language support
- [ ] Advanced notification system

## 🐛 Known Issues

- Some third-party job sources may have rate limiting
- WebSocket connections may need reconnection in poor network conditions
- Large file uploads for resumes may timeout on slow connections

## 📞 Support

- **Documentation**: Check our [docs folder](./docs)
- **Contact**: [support@recrutas.com](mailto:support@recrutas.com)





---

**Made with ❤️ by the Recrutas team**

*Disrupting the $200B recruiting industry, one connection at a time.*
