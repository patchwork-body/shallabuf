# @shallabuf-sdk/core

⚠️ **BETA VERSION - USE WITH CAUTION** ⚠️

This package is currently in beta. All APIs are subject to change without notice. Breaking changes may occur in any release until version 1.0.0.

## Overview

@shallabuf-sdk/core is a real-time communication SDK that provides WebSocket-based functionality for:

- Presence management
- Channel-based messaging
- Chat functionality with reactions and typing indicators
- Cursor position sharing
- Automatic reconnection handling

## Important Notice

- This is a pre-release version
- APIs are unstable and may change
- Breaking changes are expected
- Not recommended for production use
- Use at your own risk

## Installation

```bash
npm install @shallabuf-sdk/core@beta
```

## Basic Usage

```typescript
import { ShallabufClient } from '@shallabuf-sdk/core';

// Define your presence status type
type UserPresence = {
  status: 'online' | 'offline' | 'away';
  timestamp: string;
};

// Create a WebSocket handler
const wsHandler = {
  onMessage: (message) => {
    console.log('Received message:', message);
  },
  onError: (event) => {
    console.error('WebSocket error:', event);
  },
  onClose: (event) => {
    console.log('WebSocket closed:', event);
  },
  onOpen: (event) => {
    console.log('WebSocket connected:', event);
  },
};

// Initialize the client
const client = new ShallabufClient<UserPresence>({
  authUrl: '/api/shallabuf/jwt/issue',
  wsUrl: 'wss://shallabuf-platform.fly.dev',
}, wsHandler);

// Initialize the connection
await client.init();
```

## Features

### Presence Management

- Track user presence status
- Update presence information
- Monitor group presence

### Channel Communication

- Join/leave channels
- Send/receive messages
- Broadcast messages to channel members

### Chat Functionality

- Join/leave chat rooms
- Send messages with reactions
- Typing indicators
- Message reactions

### Cursor Position Sharing

- Share cursor positions in real-time
- Track multiple users' cursor positions
- Join/leave cursor sharing groups

## Configuration Options

```typescript
interface ShallabufConfig {
  authUrl?: string;              // Default: '/api/shallabuf/jwt/issue'
  refreshUrl?: string;           // Default: '/api/shallabuf/jwt/refresh'
  authMethod?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  wsUrl?: string;                // Default: 'wss://shallabuf-platform.fly.dev'
  reconnectInterval?: number;    // Default: 5000ms
  maxReconnectAttempts?: number; // Default: 5
  defaultPresenceStatus?: T;     // Custom presence status type
}
```

## Connection States

The client maintains the following connection states:

- `connecting`: Initial connection attempt
- `connected`: Successfully connected
- `disconnected`: Not connected
- `reconnecting`: Attempting to reconnect after disconnection

## Documentation

Documentation is subject to change. Please refer to the latest version for the most up-to-date information.

## Contributing

While this package is in beta, we welcome feedback and bug reports. Please open an issue if you encounter any problems.

## License

[License information will be added before final release]
