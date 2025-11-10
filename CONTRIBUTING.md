# Contributing to NeuroSlop AI Platform

Thank you for your interest in contributing to the NeuroSlop AI Platform! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- Neo4j database (for local testing)
- Anthropic API key

### Setup Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/yourusername/neuroslop-ai-platform.git
   cd neuroslop-ai-platform
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

5. Edit `.env` with your credentials

6. Run tests to verify setup:
   ```bash
   npm test
   ```

## Development Workflow

### 1. Create a Branch

Create a feature branch from `main`:

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test improvements

### 2. Make Changes

- Write clean, readable code
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Check coverage
npm run test:coverage

# Lint and format
npm run lint:fix
npm run format

# Type check
npm run typecheck

# Run all validations
npm run validate
```

### 4. Commit Your Changes

We use conventional commits for clear history:

```bash
git commit -m "feat: add new signal generation algorithm"
git commit -m "fix: resolve knowledge graph connection issue"
git commit -m "docs: update API documentation"
git commit -m "test: add unit tests for ReasoningEngine"
```

Commit types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub:
- Provide a clear title and description
- Reference any related issues
- Ensure all CI checks pass

## Code Style Guidelines

### TypeScript

- Use TypeScript for all code
- Enable strict mode
- Provide type annotations for public APIs
- Avoid `any` type when possible

### Naming Conventions

- **Classes**: PascalCase (`LLMService`, `ReasoningEngine`)
- **Functions**: camelCase (`generateSignal`, `fetchData`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`, `API_TIMEOUT`)
- **Interfaces**: PascalCase with descriptive names (`SignalConfig`, `MarketData`)

### File Organization

```
src/
├── core/           # Core platform components
├── data/           # Data aggregation
├── reasoning/      # Reasoning logic
├── api/            # API endpoints (future)
└── utils/          # Utilities and helpers
```

### Code Comments

- Use JSDoc for public APIs
- Explain "why" not "what"
- Keep comments up to date

```typescript
/**
 * Generates a trading signal based on reasoning results.
 * 
 * @param symbol - Stock symbol to analyze
 * @param reasoning - Array of reasoning steps
 * @returns Trading signal with confidence score
 */
async generate(symbol: string, reasoning: ReasoningStep[]): Promise<Signal>
```

## Testing Guidelines

### Writing Tests

- Write tests for all new features
- Maintain >80% code coverage
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

```typescript
describe('SignalGenerator', () => {
  describe('generate', () => {
    it('should generate buy signal for high confidence', async () => {
      // Arrange
      const highConfidenceStep = { confidence: 0.9 };
      
      // Act
      const signal = await generator.generate('AAPL', [highConfidenceStep]);
      
      // Assert
      expect(signal.type).toBe('buy');
    });
  });
});
```

### Test Structure

- One test file per source file
- Group related tests with `describe`
- Use `beforeEach` for setup
- Clean up in `afterEach`

### Mocking

- Mock external dependencies
- Use fixtures for test data
- Don't mock what you don't own

## Documentation

### Code Documentation

- Document all public APIs
- Include usage examples
- Explain complex algorithms

### README Updates

- Keep README.md up to date
- Add examples for new features
- Update installation instructions

### API Documentation

- Update `docs/API.md` for API changes
- Include parameter descriptions
- Provide code examples

### Architecture Documentation

- Update `docs/ARCHITECTURE.md` for significant changes
- Add diagrams for new components
- Explain design decisions

## Pull Request Guidelines

### Before Submitting

- [ ] All tests pass
- [ ] Code is formatted and linted
- [ ] Coverage is maintained or improved
- [ ] Documentation is updated
- [ ] Commits follow conventional format

### PR Description

Include:
- What changes were made
- Why the changes were necessary
- How to test the changes
- Screenshots (if applicable)
- Breaking changes (if any)

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Code follows style guidelines
- [ ] All tests passing
```

## Review Process

1. Automated checks run (CI/CD)
2. Code review by maintainers
3. Address feedback
4. Approval and merge

## Getting Help

- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check docs/ folder

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing!
