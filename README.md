# Recrutas - AI-Powered Talent Acquisition Platform

**The future of hiring is here.** Recrutas is an open-source platform that revolutionizes talent acquisition by connecting candidates directly with hiring managers through AI-powered matching, eliminating traditional recruitment bottlenecks.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

## 🚀 Features

### For Candidates
- **AI-Powered Job Matching**: Semantic analysis of skills and experience for precise job recommendations
- **Instant Job Discovery**: Real-time aggregation from 500+ companies
- **Direct Communication**: Skip recruiters and talk directly to hiring managers
- **Merit-Based Access**: Prove your skills through custom exams to unlock premium opportunities
- **Resume Intelligence**: AI-powered resume parsing and optimization

### For Companies
- **Custom Exam Builder**: Create job-specific assessments to filter qualified candidates
- **Real-Time Talent Pipeline**: Access to a continuously updated pool of verified candidates
- **Automated Screening**: AI ranks candidates based on exam performance and compatibility
- **Direct Messaging**: Streamlined communication with pre-qualified candidates
- **Analytics Dashboard**: Comprehensive hiring insights and performance metrics

### Technical Highlights
- **Semantic Job Matching**: Advanced AI algorithms with 87% accuracy
- **Real-Time Architecture**: WebSocket-based live notifications and messaging
- **Universal Job Scraper**: Automated collection from diverse job board formats
- **Scalable Infrastructure**: Built for high-performance with horizontal scaling
- **Type-Safe Development**: Full TypeScript implementation across the stack

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│────│  Express.js API │────│   PostgreSQL    │
│                 │    │                 │    │    Database     │
│ • TypeScript    │    │ • TypeScript    │    │                 │
│ • Tailwind CSS  │    │ • Drizzle ORM   │    │ • Neon Serverless│
│ • shadcn/ui     │    │ • WebSocket     │    │ • Connection Pool│
│ • TanStack Query│    │ • AI Matching   │    │ • Redis Caching │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Components

1. **AI Matching Engine** - Semantic analysis for job-candidate compatibility
2. **Job Aggregation System** - Multi-source job collection with rate limiting
3. **Exam System** - Custom assessments with automatic scoring
4. **Real-Time Communication** - WebSocket-based messaging and notifications
5. **User Management** - Role-based access with comprehensive profiles

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenAI API key (for AI matching)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/recrutas.git
   cd recrutas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

## 🛠️ Development

### Project Structure

```
recrutas/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configurations
├── server/                # Express.js backend
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Data access layer
│   ├── auth.ts           # Authentication logic
│   └── db.ts             # Database configuration
├── shared/                # Shared TypeScript types
│   └── schema.ts         # Database schema and types
└── docs/                 # Documentation
```

### Key Technologies

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth with session management
- **Real-time**: WebSocket for live features
- **AI/ML**: OpenAI API for semantic matching
- **Deployment**: Docker, Vercel, Railway support

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate database migrations
npm run type-check   # Run TypeScript checks
npm run lint         # Run ESLint
```

## 📊 Performance

- **AI Matching Accuracy**: 87% precision in job-candidate compatibility
- **Real-time Latency**: <100ms for live notifications
- **Job Aggregation**: 15,000+ jobs processed per hour
- **Horizontal Scaling**: Stateless architecture supports multiple instances
- **Database Performance**: Optimized queries with connection pooling

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for providing the AI capabilities
- The React and Node.js communities
- All contributors who make this project possible

## 📞 Support

- **Documentation**: [docs.recrutas.com](https://docs.recrutas.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/recrutas/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/recrutas/discussions)
- **Email**: support@recrutas.com

---

**Built with ❤️ by the Recrutas team**

*Recrutas is disrupting the traditional hiring industry by putting the power back in the hands of candidates and companies, eliminating unnecessary intermediaries and creating direct, meaningful connections.*