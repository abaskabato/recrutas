# Contributing to Recrutas

Thank you for your interest in contributing to Recrutas! This guide will help you get started with contributing to our AI-powered talent acquisition platform.

## 🚀 Quick Start for Contributors

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Git and GitHub account
- Basic knowledge of React, TypeScript, and Node.js

### Setup Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/recrutas.git
   cd recrutas
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Fill in your environment variables (see .env.example for guidance)
   ```

3. **Database Setup**
   ```bash
   npm run db:push
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

## 📋 How to Contribute

### 1. Find an Issue
- Check our [Issues page](https://github.com/yourusername/recrutas/issues)
- Look for `good first issue` or `help wanted` labels
- Comment on the issue to claim it

### 2. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 3. Make Your Changes
- Follow our code style guidelines
- Write tests for new features
- Update documentation if needed
- Ensure TypeScript compilation passes

### 4. Test Your Changes
```bash
# Run type checking
npm run type-check

# Run tests
npm test

# Test specific features
node test-ai-matching.js
node test-exam-workflow.js
```

### 5. Submit a Pull Request
- Push your branch to your fork
- Create a pull request with a clear description
- Link to the related issue
- Wait for review and feedback

## 🏗️ Project Architecture

### Frontend Structure
```
client/src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── forms/          # Form components
│   └── features/       # Feature-specific components
├── pages/              # Application pages
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configurations
└── assets/             # Static assets
```

### Backend Structure
```
server/
├── routes.ts           # API endpoints
├── storage.ts          # Database operations
├── auth.ts            # Authentication setup
├── services/          # Business logic
└── utils/             # Helper functions
```

### Shared Types
```
shared/
└── schema.ts          # Database schema and TypeScript types
```

## 🎨 Code Style Guidelines

### TypeScript
- Use TypeScript for all new code
- Define proper interfaces and types
- Use strict type checking
- Prefer explicit types over `any`

### React Components
- Use functional components with hooks
- Follow React best practices
- Use descriptive component and prop names
- Implement proper error boundaries

### Database
- Use Drizzle ORM for database operations
- Follow the existing schema patterns
- Use migrations for schema changes
- Implement proper data validation

### API Design
- Follow RESTful conventions
- Use proper HTTP status codes
- Implement input validation
- Add comprehensive error handling

## 🧪 Testing Guidelines

### Frontend Testing
- Write tests for complex components
- Test user interactions
- Mock external API calls
- Use React Testing Library

### Backend Testing
- Test API endpoints
- Mock database operations
- Test business logic
- Use proper test data

### Integration Testing
- Test complete user workflows
- Verify database operations
- Test authentication flows
- Validate real-time features

## 📝 Documentation

### Code Documentation
- Add JSDoc comments for functions
- Document complex algorithms
- Explain business logic
- Update type definitions

### User Documentation
- Update README.md for new features
- Add setup instructions
- Document configuration options
- Provide examples

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Clear Description**: What happened vs. what you expected
2. **Steps to Reproduce**: Detailed steps to recreate the issue
3. **Environment**: OS, Node.js version, browser
4. **Screenshots**: If applicable
5. **Error Messages**: Full error messages and stack traces

### Bug Report Template
```markdown
## Bug Description
A clear description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
What you expected to happen.

## Screenshots
If applicable, add screenshots.

## Environment
- OS: [e.g. macOS, Windows, Linux]
- Node.js Version: [e.g. 18.17.0]
- Browser: [e.g. Chrome 91.0]
```

## 💡 Feature Requests

For feature requests, please include:

1. **Problem Statement**: What problem does this solve?
2. **Proposed Solution**: How should it work?
3. **Alternative Solutions**: Other ways to solve the problem
4. **Use Cases**: Who would benefit from this feature?

## 🏷️ Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `documentation`: Improvements to documentation
- `frontend`: Frontend-related changes
- `backend`: Backend-related changes
- `ai`: AI/ML related features

## 📚 Development Resources

### Key Technologies
- [React Documentation](https://reactjs.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

### Platform-Specific
- [Better Auth](https://www.better-auth.com/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 🤝 Community Guidelines

### Be Respectful
- Use welcoming and inclusive language
- Respect differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what's best for the community

### Be Collaborative
- Help others learn and grow
- Share knowledge and resources
- Provide constructive feedback
- Celebrate others' contributions

### Be Professional
- Keep discussions on-topic
- Avoid controversial topics unrelated to the project
- Use appropriate language
- Maintain a professional tone

## 🎯 Contribution Areas

### High Priority
- AI matching algorithm improvements
- Real-time chat enhancements
- Mobile responsiveness
- Performance optimizations
- Security improvements

### Medium Priority
- Additional OAuth providers
- Enhanced notification system
- Analytics dashboard
- API documentation
- Accessibility improvements

### Documentation Needs
- API documentation
- Component documentation
- Deployment guides
- Troubleshooting guides
- Video tutorials

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Documentation**: Check our docs folder
- **Code Comments**: Look for inline documentation

## 🎉 Recognition

Contributors are recognized in several ways:

- Listed in our README.md contributors section
- Mentioned in release notes for significant contributions
- Invited to join our contributor Discord
- Eligible for contributor swag (coming soon!)

## 📜 Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you agree to uphold this code.

---

Thank you for contributing to Recrutas! Together, we're revolutionizing the hiring industry. 🚀