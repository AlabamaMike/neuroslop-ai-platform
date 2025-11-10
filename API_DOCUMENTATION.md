# Neurosymbolic AI Market Signals Platform - API Documentation

## Overview

This platform provides a comprehensive REST API for detecting and analyzing market signals using neurosymbolic AI reasoning. It aggregates data from multiple sources, applies advanced reasoning algorithms, and detects emerging trends, sentiment shifts, volume spikes, patterns, anomalies, and correlations.

## Quick Start

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:
- `PORT`: API server port (default: 3000)
- `SIGNAL_CONFIDENCE_THRESHOLD`: Minimum confidence for signals (0-1)
- `SIGNAL_RELEVANCE_THRESHOLD`: Minimum relevance for signals (0-1)
- `RATE_LIMIT_MAX_REQUESTS`: Maximum API requests per window
- `CACHE_TTL_SECONDS`: Cache time-to-live in seconds

### Running the Server

```bash
# Development mode
npm run dev:api

# Production mode
npm run build
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Health Endpoints

#### `GET /api/health`
Get comprehensive system health status

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-11-10T12:00:00.000Z",
    "services": {
      "api": true,
      "websocket": true,
      "cache": true,
      "signalDetector": true
    },
    "metrics": {
      "activeSignals": 42,
      "signalsDetected24h": 128,
      "avgConfidence": 0.756,
      "avgResponseTime": 45.32,
      "errorRate": 0.001
    }
  },
  "uptime": 3600000
}
```

#### `GET /api/health/ping`
Simple ping endpoint for health checks

**Response:**
```json
{
  "success": true,
  "data": "pong",
  "timestamp": "2025-11-10T12:00:00.000Z"
}
```

#### `GET /api/health/stats`
Get detailed system statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "signals": {
      "total": 42,
      "typeDistribution": {
        "emerging_trend": 15,
        "sentiment_shift": 10,
        "volume_spike": 8,
        "pattern_detected": 5,
        "anomaly": 3,
        "correlation": 1
      },
      "strengthDistribution": {
        "weak": 5,
        "moderate": 12,
        "strong": 18,
        "very_strong": 7
      }
    },
    "cache": {
      "keys": 23,
      "hits": 1250,
      "misses": 89
    },
    "aggregator": {
      "totalSources": 4,
      "enabledSources": 4,
      "cachedItems": 142
    }
  }
}
```

### Signal Endpoints

#### `POST /api/signals/search`
Search for signals with filters

**Request Body:**
```json
{
  "keywords": ["AI", "technology"],
  "entities": ["OpenAI", "Microsoft"],
  "signalTypes": ["emerging_trend", "sentiment_shift"],
  "minConfidence": 0.7,
  "minRelevance": 0.6,
  "dateRange": {
    "start": "2025-11-09T00:00:00.000Z",
    "end": "2025-11-10T23:59:59.000Z"
  },
  "limit": 10,
  "offset": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signals": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "type": "emerging_trend",
        "title": "Emerging Trend: AI, technology, innovation",
        "description": "An emerging trend has been detected...",
        "keywords": ["AI", "technology", "innovation"],
        "entities": ["OpenAI", "Microsoft"],
        "confidence": 0.85,
        "relevance": 0.78,
        "strength": "strong",
        "evidence": [...],
        "reasoning": {
          "rules": [...],
          "inferences": [...],
          "confidenceFactors": {...},
          "knowledgeGraphEntities": [...],
          "logicalChain": [...]
        },
        "metadata": {
          "dataPointCount": 45,
          "sourceDistribution": {
            "reddit": 25,
            "twitter": 20
          },
          "timeSpan": {
            "start": "2025-11-09T00:00:00.000Z",
            "end": "2025-11-10T12:00:00.000Z"
          },
          "velocity": 1.5,
          "momentum": 0.5
        },
        "createdAt": "2025-11-10T06:00:00.000Z",
        "updatedAt": "2025-11-10T12:00:00.000Z"
      }
    ],
    "total": 42,
    "page": 1,
    "pageSize": 10,
    "hasMore": true
  }
}
```

#### `GET /api/signals/:id`
Get detailed signal information

**Parameters:**
- `id` (path): Signal UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "signal": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      ...
    },
    "evolution": {
      "signalId": "550e8400-e29b-41d4-a716-446655440000",
      "snapshots": [
        {
          "timestamp": "2025-11-10T10:00:00.000Z",
          "confidence": 0.82,
          "relevance": 0.75,
          "dataPointCount": 40,
          "strength": "strong"
        }
      ],
      "trajectory": "growing",
      "healthStatus": "healthy"
    }
  }
}
```

#### `GET /api/signals/trending`
Get trending signals

**Query Parameters:**
- `limit` (number): Maximum signals to return (1-50, default: 10)
- `hours` (number): Time window in hours (1-168, default: 24)

**Response:**
```json
{
  "success": true,
  "data": {
    "trending": [
      {
        "signal": {...},
        "score": {
          "signalId": "...",
          "overallScore": 0.89,
          "components": {
            "confidence": 0.85,
            "relevance": 0.82,
            "novelty": 0.95,
            "diversity": 0.88,
            "velocity": 0.92,
            "consistency": 0.87
          },
          "weights": {...}
        },
        "trend": {
          "direction": "rising",
          "changeRate": 1.5
        }
      }
    ],
    "timeWindow": {
      "hours": 24,
      "since": "2025-11-09T12:00:00.000Z"
    }
  }
}
```

#### `POST /api/signals/detect`
Manually trigger signal detection (admin endpoint)

**Request Body:**
```json
{
  "sources": ["reddit", "twitter"],
  "keywords": ["blockchain"],
  "entities": ["Bitcoin", "Ethereum"],
  "hours": 24
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "detected": 5,
    "signals": [...],
    "dataPoints": 127
  }
}
```

### Source Configuration Endpoints

#### `GET /api/sources`
Get all data source configurations

**Response:**
```json
{
  "success": true,
  "data": {
    "sources": [
      {
        "type": "reddit",
        "enabled": true,
        "config": {...},
        "rateLimit": {
          "maxRequests": 100,
          "windowMs": 60000
        }
      }
    ],
    "total": 4
  }
}
```

#### `GET /api/sources/:type`
Get specific source configuration

**Parameters:**
- `type` (path): Source type (reddit, twitter, uspto, edgar, etc.)

#### `POST /api/sources/configure`
Configure a data source

**Request Body:**
```json
{
  "type": "reddit",
  "enabled": true,
  "config": {
    "subreddits": ["technology", "programming"],
    "maxPosts": 100
  },
  "credentials": {
    "clientId": "...",
    "clientSecret": "..."
  },
  "rateLimit": {
    "maxRequests": 100,
    "windowMs": 60000
  }
}
```

#### `PATCH /api/sources/:type/toggle`
Enable or disable a source

**Request Body:**
```json
{
  "enabled": false
}
```

#### `GET /api/sources/health`
Check health of all data sources

**Response:**
```json
{
  "success": true,
  "data": {
    "sources": {
      "reddit": true,
      "twitter": true,
      "uspto": false,
      "edgar": true
    },
    "statistics": {...},
    "summary": {
      "healthy": 3,
      "total": 4,
      "healthPercentage": 75
    }
  }
}
```

#### `DELETE /api/sources/cache`
Clear aggregator cache

## WebSocket API

Connect to `/ws` for real-time signal updates.

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  console.log('Connected to signal stream');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

### Message Types

#### `signal_detected`
New signal has been detected

```json
{
  "type": "signal_detected",
  "timestamp": "2025-11-10T12:00:00.000Z",
  "data": {
    "id": "...",
    "type": "emerging_trend",
    ...
  }
}
```

#### `signal_updated`
Existing signal has been updated

#### `signal_expired`
Signal has expired

#### `trending_update`
Trending signals update (sent every minute)

```json
{
  "type": "trending_update",
  "timestamp": "2025-11-10T12:00:00.000Z",
  "data": [
    {
      "signal": {...},
      "score": {...},
      "trend": {...}
    }
  ]
}
```

### Client Messages

Send messages to the server:

```javascript
// Subscribe to specific signal types
ws.send(JSON.stringify({
  type: 'subscribe',
  signalTypes: ['emerging_trend', 'sentiment_shift']
}));

// Ping
ws.send(JSON.stringify({
  type: 'ping'
}));
```

## Rate Limiting

The API implements rate limiting:

- General API: 100 requests per 15 minutes
- Search endpoints: 30 requests per minute
- Configuration endpoints: 10 requests per minute

Rate limit headers are included in responses:
- `RateLimit-Limit`: Maximum requests
- `RateLimit-Remaining`: Remaining requests
- `RateLimit-Reset`: Reset time

## Caching

GET requests are cached for 5 minutes by default. Cached responses include:
```json
{
  "success": true,
  "data": {...},
  "cached": true,
  "timestamp": "2025-11-10T12:00:00.000Z"
}
```

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    },
    "timestamp": "2025-11-10T12:00:00.000Z"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Invalid request data
- `NOT_FOUND` (404): Resource not found
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

## Interactive Documentation

Swagger UI documentation is available at:
```
http://localhost:3000/api/docs
```

## Examples

### Example: Search for AI-related signals

```bash
curl -X POST http://localhost:3000/api/signals/search \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["AI", "machine learning"],
    "minConfidence": 0.7,
    "limit": 5
  }'
```

### Example: Get trending signals

```bash
curl http://localhost:3000/api/signals/trending?limit=10&hours=24
```

### Example: WebSocket client

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  console.log('Connected');

  // Subscribe to updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    signalTypes: ['emerging_trend']
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);

  if (message.type === 'signal_detected') {
    console.log('New signal:', message.data.title);
  }
});
```

## Best Practices

1. **Use WebSocket for real-time updates** instead of polling endpoints
2. **Implement exponential backoff** for rate limit errors
3. **Cache responses** on the client side when appropriate
4. **Filter signals early** using search parameters to reduce data transfer
5. **Monitor health endpoints** to detect issues proactively
6. **Use trending endpoint** for discovering popular signals

## Support

For issues and questions:
- Check the [OpenAPI specification](/openapi.yaml)
- Review the [API documentation](/api/docs)
- Examine test files in `/tests` for usage examples
