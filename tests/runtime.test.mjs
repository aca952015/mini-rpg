import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/main.js';
import { initGame } from '../game.js';

function fixture() {
  const callbacks = {};
  const frames = new Map();
  const storage = new Map();
  let now = 0;
  let id = 0;
  let removed = 0;
  const ctx = new Proxy({ measureText: (text) => ({ width: text.length * 8 }), createLinearGradient: () => ({ addColorStop() {} }) }, {
    get(target, key) { return key in target ? target[key] : () => {}; }
  });
  const canvas = { width: 390, height: 844, getContext: () => ctx }; ctx.canvas = canvas;
  const subscribe = (name, handler) => { callbacks[name] = handler; return () => { delete callbacks[name]; removed++; }; };
  const platform = {
    kind: 'test', storage: { get: (key) => storage.get(key), set: (key, value) => storage.set(key, value) },
    createCanvas: () => canvas, createImage: () => ({}),
    getViewportSize: () => ({ width: 390, height: 844 }),
    getSafeArea: () => ({ top: 48, bottom: 34, left: 0, right: 0 }),
    bindInput: (_, handlers) => subscribe('input', handlers),
    onResize: (handler) => subscribe('resize', handler), onHide: (handler) => subscribe('hide', handler), onShow: (handler) => subscribe('show', handler),
    now: () => now,
    requestAnimationFrame: (handler) => { const next = id++; frames.set(next, handler); return next; },
    cancelAnimationFrame: (key) => frames.delete(key)
  };
  return { platform, callbacks, frames, storage, advance(ms) { now += ms; }, get removed() { return removed; } };
}

test('应用只有一个动画循环，后台停止、前台恢复且取消帧0', () => {
  const f = fixture(); const game = new Game(f.platform); game.init();
  assert.equal(f.frames.size, 1); assert.equal(game.frameId, 0);
  f.callbacks.show(); assert.equal(f.frames.size, 1);
  f.callbacks.hide(); assert.equal(f.frames.size, 0);
  f.advance(60000); f.callbacks.show(); assert.equal(f.frames.size, 1);
  assert.equal(game.lastTime, 60000);
  assert.equal(game.buttons[1].y + game.buttons[1].height <= 844 - 34, true);
  game.destroy(); assert.equal(f.frames.size, 0); assert.equal(f.removed, 5);
  game.destroy(); assert.equal(f.removed, 5);
});

test('按钮单击落盘一次，重新创建应用能恢复', () => {
  const f = fixture(); const game = new Game(f.platform); game.init();
  const button = game.buttons[0]; const point = { x: button.x + 4, y: button.y + 4 };
  f.callbacks.input.start(point); f.callbacks.input.end(point);
  assert.equal(game.state.clicks, 1); game.destroy();
  const restored = new Game(f.platform); restored.init();
  assert.equal(restored.state.clicks, 1); restored.destroy();
});

test('存储失败不会增加内存进度或给出保存成功', () => {
  const f = fixture(); const game = new Game(f.platform); game.init();
  f.platform.storage.set = () => { throw new Error('quota'); };
  const notices = []; game.engine.notice = (value) => notices.push(value);
  const original = console.error; console.error = () => {};
  try { game.handleAction({ action: 'demo_increment' }); } finally { console.error = original; }
  assert.equal(game.state.clicks, 0); assert.match(notices[0], /失败/); game.destroy();
});

test('初始化失败清理半成品，重复初始化先销毁旧实例', () => {
  const events = [];
  initGame(() => ({ init() { events.push('init1'); }, destroy() { events.push('destroy1'); } }));
  assert.throws(() => initGame(() => ({ init() { events.push('init2'); throw new Error('boom'); }, destroy() { events.push('destroy2'); } })), /boom/);
  assert.deepEqual(events, ['init1', 'destroy1', 'init2', 'destroy2']);
});
