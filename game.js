import { Game } from './src/main.js';
import { getPlatform } from './src/platform/index.js';

let game = null;

export function initGame(createGame = (platform) => new Game(platform)) {
  const previous = game;
  game = null;
  previous?.destroy();
  const next = createGame(getPlatform());
  try {
    next.init();
    game = next;
    return game;
  } catch (error) {
    try { next.destroy(); } catch (cleanupError) { console.error(cleanupError); }
    throw error;
  }
}

if (getPlatform().kind === 'douyin') initGame();
