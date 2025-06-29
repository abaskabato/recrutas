# Contributing to Recrutas

Thank you for your interest in contributing to Recrutas! This document provides guidelines for contributing to our AI-powered talent acquisition platform.

## 🚀 Quick Start

1. **Fork the repository**
2. **Clone your fork**: `git clone https://github.com/yourusername/recrutas.git`
3. **Install dependencies**: `npm install`
4. **Set up environment**: Copy `.env.example` to `.env` and configure
5. **Run database migrations**: `npm run db:push`
6. **Start development**: `npm run dev`

## 📋 Development Setup

### Prerequisites
- Node.js 18 or higher
- PostgreSQL database
- Git

### Environment Variables
```env
DATABASE_URL=postgresql://username:password@localhost:5432/recrutas
OPENAI_API_KEY=your-openai-api-key
SESSION_SECRET=your-32-character-secret-key
```

### Code Structure
```
├── client/          # React frontend
├── server/          # Express backend
├── shared/          # Shared schemas and types
├── uploads/         # File upload storage
└── docs/           # Documentation
```

## 🛠 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing code formatting
- Use meaningful variable and function names
- Add comments for complex logic

### Commit Messages
Follow conventional commits format:
```
feat: add AI-powered job matching
fix: resolve database connection issue
docs: update API documentation
```

### Pull Request Process
1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Make your changes and test thoroughly
3. Update documentation if needed
4. Submit a pull request with a clear description

## 🧪 Testing

```bash
# Run type checking
npm run check

# Build the application
npm run build

# Test database connection
npm run db:push
```

## 📚 Architecture Overview

### Frontend (React + TypeScript)
- Component-based architecture
- TanStack Query for state management
- Tailwind CSS for styling
- Responsive design

### Backend (Node.js + Express)
- RESTful API design
- Drizzle ORM for database operations
- WebSocket for real-time features
- Job aggregation system

### Database (PostgreSQL)
- User authentication and profiles
- Job postings and applications
- Real-time messaging
- Analytics and notifications

## 🎯 Contributing Areas

### High Priority
- [ ] Improve AI matching accuracy
- [ ] Add more job board integrations
- [ ] Enhance real-time features
- [ ] Mobile app development

### Medium Priority
- [ ] Performance optimizations
- [ ] Additional exam question types
- [ ] Advanced analytics dashboard
- [ ] API documentation

### Good First Issues
- [ ] UI/UX improvements
- [ ] Documentation updates
- [ ] Bug fixes
- [ ] Test coverage

## 🐛 Bug Reports

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, browser, Node.js version)

## 💡 Feature Requests

For new features:
- Explain the use case
- Describe the proposed solution
- Consider backward compatibility
- Include mockups if applicable

## 📖 Documentation

- Update README.md for user-facing changes
- Add inline code comments
- Update API documentation
- Include examples in pull requests

## 🤝 Code of Conduct

### Our Standards
- Be respectful and inclusive
- Welcome diverse perspectives
- Focus on constructive feedback
- Help others learn and grow

### Unacceptable Behavior
- Harassment or discrimination
- Trolling or inflammatory comments
- Personal attacks
- Sharing private information

## 📞 Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: General questions and ideas
- **Email**: [maintainers@recrutas.com] for sensitive issues

## 🏆 Recognition

Contributors will be:
- Listed in our contributors section
- Mentioned in release notes
- Invited to contributor events
- Eligible for swag and rewards

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for making Recrutas better! 🚀