import test from 'node:test';
import assert from 'node:assert/strict';

import { createBrowserPlatform } from '../src/platform/browserPlatform.js';
import { createDouyinPlatform } from '../src/platform/douyinPlatform.js';
import { createPlatform } from '../src/platform/index.js';

class EventTargetMock {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, callback) {
    const callbacks = this.listeners.get(type) || new Set();
    callbacks.add(callback);
    this.listeners.set(type, callbacks);
  }

  removeEventListener(type, callback) {
    this.listeners.get(type)?.delete(callback);
  }

  emit(type, event = {}) {
    for (const callback of this.listeners.get(type) || []) callback(event);
  }

  listenerCount(type) {
    return this.listeners.get(type)?.size || 0;
  }
}

function pointerEvent(overrides = {}) {
  return {
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    isPrimary: true,
    clientX: 20,
    clientY: 30,
    preventDefault() {},
    ...overrides
  };
}

function createStorage(overrides = {}) {
  const values = new Map();
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
    ...overrides
  };
}

function createBrowserRuntime(storage = createStorage()) {
  const window = new EventTargetMock();
  const document = new EventTargetMock();
  window.window = window;
  window.document = document;
  window.localStorage = storage;
  window.innerWidth = 360;
  window.innerHeight = 720;
  document.documentElement = { clientWidth: 360, clientHeight: 720 };
  document.body = { style: {} };
  document.hidden = false;
  return { window, document };
}

function createDouyinRuntime(overrides = {}) {
  const callbacks = new Map();
  const runtime = {
    getSystemInfoSync: () => ({ windowWidth: 360, windowHeight: 720 }),
    createCanvas: () => ({}),
    createImage: () => ({}),
    getStorageSync: () => null,
    setStorageSync: () => undefined,
    removeStorageSync: () => undefined,
    onTouchStart: callback => callbacks.set('touchStart', callback),
    offTouchStart: callback => { if (callbacks.get('touchStart') === callback) callbacks.delete('touchStart'); },
    onTouchMove: callback => callbacks.set('touchMove', callback),
    offTouchMove: callback => { if (callbacks.get('touchMove') === callback) callbacks.delete('touchMove'); },
    onTouchEnd: callback => callbacks.set('touchEnd', callback),
    offTouchEnd: callback => { if (callbacks.get('touchEnd') === callback) callbacks.delete('touchEnd'); },
    onTouchCancel: callback => callbacks.set('touchCancel', callback),
    offTouchCancel: callback => { if (callbacks.get('touchCancel') === callback) callbacks.delete('touchCancel'); },
    onShow: callback => callbacks.set('show', callback),
    offShow: callback => { if (callbacks.get('show') === callback) callbacks.delete('show'); },
    onHide: callback => callbacks.set('hide', callback),
    offHide: callback => { if (callbacks.get('hide') === callback) callbacks.delete('hide'); },
    onWindowResize: callback => callbacks.set('resize', callback),
    offWindowResize: callback => { if (callbacks.get('resize') === callback) callbacks.delete('resize'); },
    ...overrides
  };
  return { runtime, callbacks };
}

test('createPlatform selects browser and wrapped Douyin runtimes', () => {
  const browser = createBrowserRuntime();
  assert.equal(createPlatform(browser.window).kind, 'browser');

  const { runtime } = createDouyinRuntime();
  assert.equal(createPlatform({ tt: runtime }).kind, 'douyin');
});

test('browser input accepts only the primary pointer and reports cancel in logical canvas coordinates', () => {
  const { window } = createBrowserRuntime();
  const canvas = new EventTargetMock();
  canvas.width = 300;
  canvas.height = 600;
  canvas.style = { touchAction: 'pan-y' };
  canvas.getBoundingClientRect = () => ({ left: 10, top: 20, width: 150, height: 300 });

  const starts = [];
  const moves = [];
  const cancels = [];
  const platform = createBrowserPlatform(window);
  const unbind = platform.bindInput(canvas, {
    start: point => starts.push(point),
    move: point => moves.push(point),
    cancel: point => cancels.push(point)
  });

  canvas.emit('pointerdown', pointerEvent({ pointerId: 10, button: 2 }));
  canvas.emit('pointerdown', pointerEvent({ pointerId: 11, pointerType: 'touch', isPrimary: false }));
  canvas.emit('pointerdown', pointerEvent({ pointerId: 12, pointerType: 'touch', clientX: 25, clientY: 40 }));
  canvas.emit('pointerdown', pointerEvent({ pointerId: 13, pointerType: 'touch' }));
  canvas.emit('pointermove', pointerEvent({ pointerId: 13, pointerType: 'touch' }));
  window.emit('pointermove', pointerEvent({ pointerId: 12, pointerType: 'touch', clientX: 40, clientY: 50 }));
  window.emit('pointercancel', pointerEvent({ pointerId: 12, pointerType: 'touch', clientX: 55, clientY: 65 }));

  assert.equal(starts.length, 1);
  assert.deepEqual({ x: starts[0].x, y: starts[0].y }, { x: 30, y: 40 });
  assert.equal(moves.length, 1);
  assert.deepEqual({ x: moves[0].x, y: moves[0].y }, { x: 60, y: 60 });
  assert.equal(cancels.length, 1);
  assert.deepEqual({ x: cancels[0].x, y: cancels[0].y }, { x: 90, y: 90 });
  assert.equal(canvas.style.touchAction, 'none');

  unbind();
  assert.equal(canvas.style.touchAction, 'pan-y');
  assert.equal(canvas.listenerCount('pointerdown'), 0);
  assert.equal(window.listenerCount('pointercancel'), 0);
  assert.equal(window.listenerCount('pointermove'), 0);
});

test('browser input handles mouse completion and ignores hover while dragging', () => {
  const { window } = createBrowserRuntime();
  const canvas = new EventTargetMock();
  canvas.width = 100;
  canvas.height = 100;
  canvas.style = {};
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 });
  const calls = [];
  createBrowserPlatform(window).bindInput(canvas, {
    start: () => calls.push('start'),
    hover: () => calls.push('hover'),
    end: () => calls.push('end')
  });

  canvas.emit('pointermove', pointerEvent());
  canvas.emit('pointerdown', pointerEvent());
  canvas.emit('pointermove', pointerEvent({ pointerId: 2 }));
  window.emit('pointerup', pointerEvent());

  assert.deepEqual(calls, ['hover', 'start', 'end']);
});

test('Douyin input tracks one touch through move and cancellation, then unsubscribes', () => {
  const { runtime, callbacks } = createDouyinRuntime();
  const calls = [];
  const unbind = createDouyinPlatform({ tt: runtime }).bindInput(null, {
    start: point => calls.push(['start', point.pointerId]),
    move: point => calls.push(['move', point.pointerId]),
    cancel: point => calls.push(['cancel', point.pointerId])
  });

  callbacks.get('touchStart')({ changedTouches: [{ identifier: 4, clientX: 1, clientY: 2 }] });
  callbacks.get('touchStart')({ changedTouches: [{ identifier: 5, clientX: 3, clientY: 4 }] });
  callbacks.get('touchMove')({ touches: [{ identifier: 5 }, { identifier: 4, clientX: 6, clientY: 7 }] });
  callbacks.get('touchCancel')({ changedTouches: [{ identifier: 5 }, { identifier: 4, clientX: 8, clientY: 9 }] });

  assert.deepEqual(calls, [['start', 4], ['move', 4], ['cancel', 4]]);
  unbind();
  assert.equal(callbacks.has('touchStart'), false);
  assert.equal(callbacks.has('touchMove'), false);
  assert.equal(callbacks.has('touchEnd'), false);
  assert.equal(callbacks.has('touchCancel'), false);
});

test('browser lifecycle subscriptions can all be removed', () => {
  const { window, document } = createBrowserRuntime();
  const platform = createBrowserPlatform(window);
  let shown = 0;
  let hidden = 0;
  let resized = 0;
  const offShow = platform.onShow(() => { shown += 1; });
  const offHide = platform.onHide(() => { hidden += 1; });
  const offResize = platform.onResize(() => { resized += 1; });

  window.emit('pageshow');
  document.hidden = true;
  document.emit('visibilitychange');
  window.emit('resize');
  assert.deepEqual([shown, hidden, resized], [1, 1, 1]);

  offShow();
  offHide();
  offResize();
  window.emit('pageshow');
  window.emit('pagehide');
  window.emit('resize');
  assert.deepEqual([shown, hidden, resized], [1, 1, 1]);
});

test('Douyin lifecycle subscriptions can all be removed', () => {
  const { runtime, callbacks } = createDouyinRuntime();
  const platform = createDouyinPlatform(runtime);
  const offShow = platform.onShow(() => {});
  const offHide = platform.onHide(() => {});
  const offResize = platform.onResize(() => {});
  offShow();
  offHide();
  offResize();
  assert.equal(callbacks.has('show'), false);
  assert.equal(callbacks.has('hide'), false);
  assert.equal(callbacks.has('resize'), false);
});

test('browser storage probe uses the mini-rpg namespace and cleans up', () => {
  let probeKey = '';
  const storage = createStorage({
    setItem(key, value) {
      probeKey = key;
      this.value = value;
    },
    getItem(key) {
      return key === probeKey ? this.value : null;
    },
    removeItem(key) {
      assert.equal(key, probeKey);
      this.value = null;
    }
  });
  const { window } = createBrowserRuntime(storage);

  assert.equal(createBrowserPlatform(window).validateStorage(), true);
  assert.match(probeKey, /^__mini_rpg_storage_probe__/);
  assert.equal(storage.value, null);
});

test('storage probe and write errors remain visible to callers', () => {
  const brokenStorage = createStorage({
    setItem() { throw new Error('quota denied'); }
  });
  const { window } = createBrowserRuntime(brokenStorage);
  assert.throws(
    () => createBrowserPlatform(window).validateStorage(),
    /localStorage write probe failed: quota denied/
  );

  const writeError = new Error('disk full');
  const { runtime } = createDouyinRuntime({
    setStorageSync() { throw writeError; }
  });
  const platform = createDouyinPlatform(runtime);
  assert.throws(() => platform.storage.set('save', '{}'), error => error === writeError);
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    assert.throws(() => platform.storage.handleWriteFailure(writeError), error => error === writeError);
  } finally {
    console.error = originalConsoleError;
  }
});

test('platform safe areas use logical viewport coordinates and clear the Douyin menu capsule', () => {
  const { window } = createBrowserRuntime();
  assert.deepEqual(createBrowserPlatform(window).getSafeArea(), {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  });

  const { runtime } = createDouyinRuntime({
    getSystemInfoSync: () => ({
      windowWidth: 360,
      windowHeight: 720,
      pixelRatio: 3,
      safeArea: { top: 24, right: 354, bottom: 700, left: 6 }
    }),
    getMenuButtonLayout: () => ({ top: 28, height: 32, left: 274, width: 78 })
  });
  const platform = createDouyinPlatform(runtime);

  assert.deepEqual(platform.getViewportSize(), { width: 360, height: 720 });
  assert.deepEqual(platform.getSafeArea(), { top: 60, right: 6, bottom: 20, left: 6 });
});

test('Douyin safe area tolerates missing and failing menu layout APIs', () => {
  const { runtime } = createDouyinRuntime({
    getSystemInfoSync: () => ({
      windowWidth: 360,
      windowHeight: 720,
      safeArea: { top: 18, right: 360, bottom: 720, left: 0 }
    }),
    getMenuButtonLayout: () => { throw new Error('unsupported'); }
  });

  assert.deepEqual(createDouyinPlatform(runtime).getSafeArea(), {
    top: 18,
    right: 0,
    bottom: 0,
    left: 0
  });
});
