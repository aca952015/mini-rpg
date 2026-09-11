import test from 'node:test';
import assert from 'node:assert/strict';
import { JsonStore } from '../src/core/storage.js';
import { InputController } from '../src/core/input.js';

test('存档隔离键空间，序列化往返，损坏数据不覆盖', () => {
  const entries = new Map([['wuxia_player_data', 'untouched']]);
  const store = new JsonStore({ get: (key) => entries.get(key), set: (key, value) => entries.set(key, value) }, 'mini_rpg_demo_v1');
  assert.deepEqual(store.load({ version: 1, clicks: 0 }), { version: 1, clicks: 0 });
  store.save({ version: 1, clicks: 5 });
  assert.equal(store.load({}).clicks, 5);
  entries.set(store.key, '{broken');
  assert.throws(() => store.load({}));
  assert.equal(entries.get(store.key), '{broken');
  assert.equal(entries.get('wuxia_player_data'), 'untouched');
});

test('写入失败向调用者报告', () => {
  const store = new JsonStore({ set() { throw new Error('quota'); } }, 'test');
  assert.throws(() => store.save({ version: 1, clicks: 1 }), /quota/);
});

function inputFixture() {
  const actions = [];
  let handlers;
  let removed = false;
  const root = { _isPressed: false, handleMouseDown() { this._isPressed = true; }, handleMouseMove() {}, handleClick() { return { type: 'upgrade' }; } };
  const input = new InputController({ bindInput(_, next) { handlers = next; return () => { removed = true; }; } }, {}, { root }, (a) => actions.push(a));
  return { input, root, actions, get handlers() { return handlers; }, get removed() { return removed; } };
}

test('每次触点释放只派发一次动作，取消后不误触', () => {
  const f = inputFixture();
  f.handlers.start({ x: 10, y: 10 }); f.handlers.end({ x: 10, y: 10 });
  f.handlers.end({ x: 10, y: 10 });
  assert.equal(f.actions.length, 1);
  f.handlers.start({ x: 10, y: 10 }); f.handlers.cancel(); f.handlers.end({ x: 10, y: 10 });
  assert.equal(f.actions.length, 1);
  assert.equal(f.root._isPressed, false);
  f.input.destroy(); assert.equal(f.removed, true);
});

test('拖动与仅在释放时发现的大位移都不会变成点击', () => {
  const f = inputFixture();
  f.handlers.start({ x: 0, y: 0 }); f.handlers.move({ x: 20, y: 0 }); f.handlers.end({ x: 0, y: 0 });
  f.handlers.start({ x: 0, y: 0 }); f.handlers.end({ x: 20, y: 0 });
  assert.equal(f.actions.length, 0);
});

test('存储结构由调用者校验，校验失败不写入', () => {
  const writes = [];
  const store = new JsonStore({ get: () => '{"version":2}', set: (...args) => writes.push(args) }, 'custom', (v) => v?.version === 1);
  assert.throws(() => store.load({ version: 1 }), /不受支持/);
  assert.throws(() => store.save({ version: 2 }), /不受支持/);
  assert.equal(writes.length, 0);
});
