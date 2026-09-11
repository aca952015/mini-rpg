import { createBrowserPlatform } from './browserPlatform.js';
import { createDouyinPlatform } from './douyinPlatform.js';

function isDouyinRuntime(runtime) {
  if (runtime?.tt) {
    return true;
  }

  const candidate = runtime?.tt || runtime;
  return (
    typeof candidate?.createCanvas === 'function'
      && typeof candidate?.getSystemInfoSync === 'function'
  ) || typeof candidate?.getStorageSync === 'function';
}

export function createPlatform(runtime = globalThis) {
  return isDouyinRuntime(runtime)
    ? createDouyinPlatform(runtime)
    : createBrowserPlatform(runtime);
}

let platform = createPlatform();

export function getPlatform() {
  return platform;
}

export function setPlatform(nextPlatform) {
  if (!nextPlatform) {
    throw new Error('A platform implementation is required');
  }
  platform = nextPlatform;
  return platform;
}

export { createBrowserPlatform, createDouyinPlatform };
