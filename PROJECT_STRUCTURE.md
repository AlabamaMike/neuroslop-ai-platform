# Project Structure

## Complete File Tree

```
neuroslop-ai-platform/
├── src/
│   ├── signals/                    # Signal Detection System
│   │   ├── types.ts                # Comprehensive type definitions
│   │   ├── scoring.ts              # Multi-dimensional signal scoring
│   │   ├── aggregator.ts           # Data aggregation with caching
│   │   └── detector.ts             # Signal detection engine
│   │
│   ├── api/                        # REST API & WebSocket
│   │   ├── server.ts               # Express server setup
│   │   ├── websocket.ts            # WebSocket server
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts    # Error handling
│   │   │   ├── validation.ts      # Request validation
│   │   │   ├── cache.ts            # Response caching
│   │   │   ├── rateLimiter.ts     # Rate limiting
│   │   │   └── logger.ts           # Winston logging
│   │   └── routes/
│   │       ├── signals.ts          # Signal endpoints
│   │       ├── sources.ts          # Source config endpoints
│   │       └── health.ts           # Health check endpoints
│   │
│   ├── data-sources/               # Data source integrations
│   ├── reasoning/                  # Reasoning engines
│   ├── core/                       # Core platform logic
│   └── index.ts                    # Main exports
│
├── tests/
│   ├── signals/
│   │   ├── scoring.test.ts         # Scoring tests
│   │   ├── aggregator.test.ts      # Aggregator tests
│   │   └── detector.test.ts        # Detector tests
│   ├── api/
│   │   └── server.test.ts          # API integration tests
│   └── [other test files...]
│
├── openapi.yaml                     # OpenAPI 3.0 specification
├── API_DOCUMENTATION.md             # API usage guide
├── AGENT4_IMPLEMENTATION.md         # Implementation summary
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript configuration
├── jest.config.js                   # Test configuration
├── .env                             # Environment variables
└── README.md                        # Project overview

```

## Key Components

### Signal Detection (`src/signals/`)
- **types.ts**: All TypeScript interfaces and enums
- **scoring.ts**: Multi-dimensional signal scoring
- **aggregator.ts**: Data source aggregation
- **detector.ts**: Core detection algorithms

### API Layer (`src/api/`)
- **server.ts**: Express application with middleware
- **websocket.ts**: Real-time updates
- **middleware/**: Security, validation, caching, rate limiting
- **routes/**: RESTful endpoint handlers

### Tests (`tests/`)
- Unit tests for all core components
- Integration tests for API
- Using Vitest framework

### Documentation
- **openapi.yaml**: Complete API specification
- **API_DOCUMENTATION.md**: Developer guide
- **AGENT4_IMPLEMENTATION.md**: Implementation details

## File Counts

- TypeScript source files: 37
- Test files: 21
- Documentation files: 5
- Configuration files: 4

## Lines of Code

- Signal Detection: ~1,600 LOC
- API Layer: ~1,400 LOC
- Tests: ~700 LOC
- Documentation: ~1,200 lines

Total: ~4,900+ lines of production code
