# shallabuf React SDK

A React-specific SDK for shallabuf that provides hooks and components for easy integration with React applications.

## Installation

```bash
npm install shallabuf-sdk
# or
yarn add shallabuf-sdk
# or
bun add shallabuf-sdk
```

## Usage

### Basic Setup

Wrap your app with the `shallabufProvider`:

```tsx
import { shallabufProvider } from 'shallabuf-sdk/react';

function App() {
  return (
    <shallabufProvider
      config={{
        auth_url: '/api/shallabuf',
        ws_url: 'wss://shallabuf.fly.dev',
      }}
      onConnect={() => console.log('Connected to shallabuf')}
      onDisconnect={() => console.log('Disconnected from shallabuf')}
      onError={(error) => console.error('shallabuf error:', error)}
    >
      <YourApp />
    </shallabufProvider>
  );
}
```

### Using the shallabuf Client

Use the `useshallabuf` hook to access the shallabuf client:

```tsx
import { useshallabuf } from 'shallabuf-sdk/react';

function YourComponent() {
  const { client, isConnected, error, send } = useshallabuf();

  const handleSendMessage = () => {
    send(JSON.stringify({ type: 'message', content: 'Hello!' }));
  };

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <p>Connection status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={handleSendMessage}>Send Message</button>
    </div>
  );
}
```

### Using Presence Features

Use the `usePresence` hook to handle presence functionality:

```tsx
import { usePresence } from 'shallabuf-sdk/react';

function PresenceComponent() {
  const { presenceData, checkPresence } = usePresence({
    groups: ['group1', 'group2'],
    initialStatus: 'online',
    onUpdate: (group, userId, status) => {
      console.log(`User ${userId} in group ${group} is now ${status}`);
    },
    onScan: (data) => {
      console.log('Current presence data:', data);
    },
  });

  return (
    <div>
      <h2>Online Users</h2>
      {Object.entries(presenceData).map(([group, users]) => (
        <div key={group}>
          <h3>{group}</h3>
          <ul>
            {Object.entries(users).map(([userId, status]) => (
              <li key={userId}>
                User {userId}: {status}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button onClick={() => checkPresence()}>Refresh Presence</button>
    </div>
  );
}
```

### Using the Context

You can also use the `useshallabufContext` hook to access the shallabuf client from any component within the provider:

```tsx
import { useshallabufContext } from 'shallabuf-sdk/react';

function AnotherComponent() {
  const { client, isConnected } = useshallabufContext();

  return (
    <div>
      <p>Connection status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      {/* Use client here */}
    </div>
  );
}
```

## API Reference

### shallabufProvider

Props:

- `config`: Configuration options for the shallabuf client
- `onConnect`: Callback function called when the client connects
- `onDisconnect`: Callback function called when the client disconnects
- `onError`: Callback function called when an error occurs

### useshallabuf

Returns:

- `client`: The shallabuf client instance
- `isConnected`: Boolean indicating connection status
- `error`: Any error that occurred
- `send`: Function to send messages
- `close`: Function to close the connection

### usePresence

Options:

- `groups`: Array of presence groups to monitor
- `initialStatus`: Initial presence status
- `onUpdate`: Callback for presence updates
- `onScan`: Callback for presence scan results

Returns:

- `presenceData`: Current presence data
- `checkPresence`: Function to manually check presence
