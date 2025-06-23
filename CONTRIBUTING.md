# Contributing to Recrutas

Thank you for your interest in contributing to Recrutas! This document provides guidelines for contributing to our AI-powered talent acquisition platform.

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Git knowledge
- Basic understanding of React and Express.js

### Development Setup
1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/yourusername/recrutas.git
   cd recrutas
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
5. Set up your database and fill in the `.env` file
6. Run database migrations:
   ```bash
   npm run db:push
   ```
7. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
recrutas/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Main application pages
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utility functions
├── server/          # Express.js backend
│   ├── routes.ts        # API endpoints
│   ├── storage.ts       # Database operations
│   ├── ai-service.ts    # AI matching logic
│   └── services/        # External integrations
├── shared/          # Shared types and schemas
└── docs/            # Documentation
```

## Development Workflow

### Making Changes
1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes following our coding standards
3. Test your changes thoroughly
4. Commit with descriptive messages:
   ```bash
   git commit -m "feat: add AI-powered job matching algorithm"
   ```
5. Push to your fork and create a pull request

### Coding Standards

#### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow existing code style and patterns
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

#### React Components
- Use functional components with hooks
- Follow the existing component structure
- Use Tailwind CSS for styling
- Ensure responsive design (mobile-first)

#### Backend API
- Follow RESTful conventions
- Use proper HTTP status codes
- Validate input using Zod schemas
- Handle errors gracefully

### Database Changes
- Use Drizzle ORM for all database operations
- Create migrations for schema changes:
  ```bash
  npm run db:push
  ```
- Never modify the database directly

## Areas for Contribution

### High Impact Areas
1. **AI Matching Algorithm**: Improve semantic matching accuracy
2. **Job Scraping**: Add new company career page scrapers
3. **Exam System**: Enhance auto-grading capabilities
4. **Mobile Experience**: Optimize for mobile users
5. **Performance**: Optimize database queries and API responses

### Good First Issues
- UI/UX improvements
- Bug fixes in existing features
- Documentation updates
- Test coverage improvements
- Accessibility enhancements

### Feature Requests
Before implementing new features:
1. Check if an issue already exists
2. Create a feature request issue with:
   - Clear problem description
   - Proposed solution
   - Expected impact on users
3. Wait for maintainer approval before starting work

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run specific test files
npm test -- matching-algorithm.test.ts

# Run tests in watch mode
npm test -- --watch
```

### Writing Tests
- Write unit tests for new functions
- Add integration tests for API endpoints
- Test edge cases and error scenarios
- Maintain at least 80% code coverage

## Pull Request Guidelines

### Before Submitting
- [ ] Code follows project standards
- [ ] Tests pass locally
- [ ] Documentation updated (if needed)
- [ ] No console.log statements left in code
- [ ] Changes tested on mobile devices

### PR Description Template
```markdown
## What does this PR do?
Brief description of changes

## Why was this change made?
Context and motivation

## How was this tested?
Testing approach and scenarios covered

## Screenshots (if applicable)
Before/after images for UI changes

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Mobile-responsive
```

## Code Review Process

1. All PRs require at least one review
2. Address all review comments
3. Ensure CI checks pass
4. Squash commits before merging (if requested)

## Issue Reporting

### Bug Reports
Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser/environment details
- Screenshots (if applicable)

### Feature Requests
Include:
- Problem you're trying to solve
- Proposed solution
- Alternative solutions considered
- Additional context

## Community Guidelines

- Be respectful and inclusive
- Help other contributors
- Ask questions if you're unsure
- Provide constructive feedback
- Follow our Code of Conduct

## Getting Help

- Check existing documentation
- Search closed issues
- Ask questions in new issues
- Contact maintainers for guidance

## Recognition

Contributors will be:
- Listed in our README
- Mentioned in release notes
- Invited to join our contributor community

Thank you for helping make Recrutas better!