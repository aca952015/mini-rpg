import { createBrowserPlatform, setPlatform } from './src/platform/index.js';

export async function bootstrapBrowserGame(runtime = globalThis, loadGame = () => import('./game.js')) {
  const platform = createBrowserPlatform(runtime);
  platform.validateStorage();
  setPlatform(platform);
  const { initGame } = await loadGame();
  return initGame();
}

if (globalThis.document) {
  const status = document.getElementById('boot-status');
  const fail = (error) => {
    status.hidden = false;
    status.textContent = `启动失败：${error?.message || error}`;
    console.error(error);
  };
  window.addEventListener('error', (event) => fail(event.error || event.message));
  window.addEventListener('unhandledrejection', (event) => fail(event.reason));
  bootstrapBrowserGame().then(() => { status.hidden = true; }).catch(fail);
}
