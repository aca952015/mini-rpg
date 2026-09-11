import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/main.js';
import { initGame } from '../game.js';
import { UI_ACTIONS } from '../src/core/actionTypes.js';
import { GAME_ACTIONS, GAME_EVENTS } from '../src/game/actionTypes.js';

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

test('实际导航、确认弹窗与保存动作通过唯一入口执行，关闭后恢复页面输入', () => {
  const f = fixture(); const game = new Game(f.platform); game.init();
  const changed = []; game.events.on(GAME_EVENTS.PROGRESS_CHANGED, (event) => changed.push(event.clicks));
  const click = (button, parent = { x: 0, y: 0 }) => {
    const point = { x: parent.x + button.x + 8, y: parent.y + button.y + 8 };
    f.callbacks.input.start(point); f.callbacks.input.end(point);
  };
  click(game.uiManager.navigation[1].button);
  assert.equal(game.uiManager.currentViewName, 'progress');
  click(game.uiManager.currentView.openButton);
  assert.equal(game.uiManager.modals.length, 1);
  click(game.uiManager.navigation[0].button);
  assert.equal(game.uiManager.currentViewName, 'progress');
  const modal = game.uiManager.modals[0].component;
  click(modal.confirmButton, modal);
  assert.equal(game.state.clicks, 1); assert.deepEqual(changed, [1]); assert.equal(game.uiManager.modals.length, 0);
  game.uiManager.render(game.state); assert.equal(game.uiManager.currentView.clicks, 1);
  click(game.uiManager.navigation[0].button); click(game.buttons[0]);
  assert.deepEqual(changed, [1, 2]);
  game.destroy(); assert.notEqual(game.handleAction({ type: GAME_ACTIONS.INCREMENT }).status, 'handled');
});

test('确认保存失败保留弹窗与原进度，取消及后台恢复不产生幽灵点击', () => {
  const f = fixture(); const game = new Game(f.platform); game.init();
  game.handleAction({ type: UI_ACTIONS.OPEN_MODAL, name: 'upgrade' });
  f.platform.storage.set = () => { throw new Error('quota'); };
  const original = console.error; console.error = () => {};
  try { assert.equal(game.handleAction({ type: GAME_ACTIONS.CONFIRM_INCREMENT }).status, 'error'); }
  finally { console.error = original; }
  assert.equal(game.state.clicks, 0); assert.equal(game.uiManager.modals.length, 1);
  const modal = game.uiManager.modals[0].component;
  const point = { x: modal.x + modal.confirmButton.x + 5, y: modal.y + modal.confirmButton.y + 5 };
  f.callbacks.input.start(point); f.callbacks.hide(); f.callbacks.show(); f.callbacks.input.end(point);
  assert.equal(game.state.clicks, 0); assert.equal(game.uiManager.modals.length, 1);
  game.handleAction({ type: UI_ACTIONS.CLOSE_MODAL, name: 'upgrade' });
  assert.equal(game.uiManager.modals.length, 0); game.destroy();
});
