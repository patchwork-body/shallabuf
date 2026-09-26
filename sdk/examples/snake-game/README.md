# Snake Game

A modern Snake game built with HTML5 Canvas, TypeScript, and Bun.

## Features

- 🎮 Classic Snake gameplay
- 🎨 Modern, beautiful UI with gradient backgrounds and animations
- 📱 Responsive design that works on mobile and desktop
- ⌨️ Multiple control schemes (Arrow keys or WASD)
- 🏆 High score tracking with localStorage
- ⏸️ Pause/resume functionality
- 🎯 Progressive difficulty (speed increases as you eat food)
- ✨ Smooth animations and visual effects

## Controls

- **Arrow Keys** or **WASD**: Move the snake
- **Space**: Start game / Pause / Resume
- **Start Button**: Begin a new game
- **Pause Button**: Pause/resume the current game
- **Reset Button**: Reset the game to initial state

## Getting Started

### Prerequisites

- Bun (latest version)

### Installation

1. Navigate to the snake-game directory:

   ```bash
   cd sdk/examples/snake-game
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Build the game:

   ```bash
   bun run build
   ```

4. Start the development server:

   ```bash
   bun run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

### Development

For development with auto-reload:

```bash
bun run dev
```

This will start the server with file watching enabled.

### Production

To run the production server:

```bash
bun run start
```

## Game Rules

1. Control the snake to eat the red food
2. Each food eaten increases your score by 10 points
3. The snake grows longer with each food eaten
4. The game speed increases as you progress
5. Avoid hitting the walls or the snake's own body
6. Try to beat your high score!

## Technical Details

### Architecture

The game is built with a modular architecture:

- **`types.ts`**: TypeScript interfaces and types
- **`utils.ts`**: Utility functions for game logic
- **`renderer.ts`**: Canvas rendering and visual effects
- **`game.ts`**: Main game logic and state management
- **`main.ts`**: Entry point and initialization
- **`server.ts`**: Bun server for serving the game

### Key Features

- **Fixed timestep game loop**: Ensures consistent gameplay across different frame rates
- **Collision detection**: Efficient boundary and self-collision checking
- **State management**: Clean separation of game state and rendering
- **Local storage**: Persistent high score tracking
- **Responsive design**: Adapts to different screen sizes

### Technologies Used

- **TypeScript**: Type-safe JavaScript for better development experience
- **Bun**: Fast JavaScript runtime and bundler
- **HTML5 Canvas**: Hardware-accelerated 2D graphics
- **CSS3**: Modern styling with gradients and animations
- **Local Storage API**: Persistent data storage

## Build System

The project uses Bun for building and serving:

- **Build**: `bun build ./src/main.ts --outdir ./dist --env PUBLIC_*`
- **Development**: Auto-reload server with file watching
- **Production**: Optimized static file serving

## Customization

You can easily customize the game by modifying the `GameConfig` in `game.ts`:

```typescript
this.config = {
  gridSize: 20, // Size of each grid cell
  canvasWidth: 400, // Canvas width
  canvasHeight: 400, // Canvas height
  gameSpeed: 150, // Initial game speed (ms per frame)
  initialSnakeLength: 3, // Starting snake length
};
```

## Browser Compatibility

This game works in all modern browsers that support:

- HTML5 Canvas
- ES2020 JavaScript features
- CSS3 animations
- Local Storage API

## License

This project is part of the shallabuf SDK examples and is available for educational and demonstration purposes.
