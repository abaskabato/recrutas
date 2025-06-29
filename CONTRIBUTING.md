# Contributing to Recrutas

Thank you for your interest in contributing to Recrutas! This guide will help you get started with contributing to our AI-powered talent platform.

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- PostgreSQL database
- Git
- OpenAI API key for AI features

### Development Setup

1. **Fork and clone the repository**
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
```

4. **Initialize database**
```bash
npm run db:push
```

5. **Start development server**
```bash
npm run dev
```

## 🏗 Project Structure

```
recrutas/
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities and configurations
├── server/           # Express backend
│   ├── routes.ts     # API routes
│   ├── storage.ts    # Database operations
│   └── *.ts          # Various server modules
├── shared/           # Shared types and schemas
│   └── schema.ts     # Database schema and types
└── scripts/          # Build and deployment scripts
```

## 🛠 Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow existing ESLint and Prettier configurations
- Use meaningful variable and function names
- Add comments for complex logic

### Database Changes
- All database changes must go through Drizzle schema
- Use `npm run db:push` to apply schema changes
- Never write raw SQL migrations

### API Development
- Keep routes thin - business logic belongs in storage or services
- Validate inputs using Zod schemas
- Return consistent JSON responses
- Use proper HTTP status codes

### Frontend Development
- Use shadcn/ui components when possible
- Follow existing patterns for forms and data fetching
- Use TanStack Query for server state management
- Ensure responsive design

## 🧪 Testing

### Running Tests
```bash
npm test
```

### Adding Tests
- Write unit tests for new utilities and services
- Add integration tests for API endpoints
- Test UI components with realistic data

## 📝 Pull Request Process

1. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes**
- Follow the coding standards
- Add tests if applicable
- Update documentation

3. **Commit your changes**
```bash
git add .
git commit -m "feat: add your feature description"
```

Use conventional commit format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `refactor:` for code refactoring
- `test:` for adding tests

4. **Push and create PR**
```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## 🔍 What We're Looking For

### High Priority Areas
- **AI Matching Improvements**: Enhanced algorithms for job-candidate matching
- **Performance Optimization**: Faster job scraping and search
- **User Experience**: Better UI/UX for both candidates and hiring managers
- **Testing**: Comprehensive test coverage
- **Documentation**: Clear guides and API documentation

### Feature Ideas
- Advanced filtering options
- Mobile app development
- Integration with more job boards
- Enhanced communication features
- Analytics and reporting

## 🚨 Bug Reports

### Before Reporting
- Check existing issues to avoid duplicates
- Verify the bug exists in the latest version
- Test with a clean database if possible

### Bug Report Template
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. macOS]
- Browser: [e.g. Chrome]
- Node.js version: [e.g. 18.17.0]
```

## 💡 Feature Requests

We welcome feature requests! Please:
- Check if the feature already exists
- Describe the problem it solves
- Explain how it would work
- Consider implementation challenges

## 📚 Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [TanStack Query Guide](https://tanstack.com/query)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Better Auth Documentation](https://www.better-auth.com/)

## 🤝 Community

- **Discord**: [Join our community] (Coming soon)
- **GitHub Discussions**: Ask questions and share ideas
- **Twitter**: Follow [@RecrutasAI] for updates

## 📄 License

By contributing to Recrutas, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in our README and release notes. We appreciate every contribution, no matter how small!

---

**Questions?** Feel free to open an issue or start a discussion. We're here to help!