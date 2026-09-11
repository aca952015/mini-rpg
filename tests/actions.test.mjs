import test from 'node:test';
import assert from 'node:assert/strict';

import { ActionRouter, normalizeAction } from '../src/core/actionRouter.js';
import { EVENTS } from '../src/core/actionTypes.js';
import { EventEmitter, EventManager } from '../src/engine/event.js';

test('normalizeAction supports flat Button and legacy action/data results without mutation', () => {
  const flat = { type: 'buy', itemId: 7, amount: 2 };
  const canonicalWithNestedData = { type: 'openModal', name: 'upgrade', data: { itemId: 7 } };
  const legacy = { action: 'select', data: { index: 3 } };
  const wrapped = { type: 'button', action: 'equip', data: { slot: 'main' } };
  const flatSnapshot = structuredClone(flat);
  const legacySnapshot = structuredClone(legacy);
  const wrappedSnapshot = structuredClone(wrapped);

  assert.deepEqual(normalizeAction(flat), {
    type: 'buy',
    data: { itemId: 7, amount: 2 }
  });
  assert.deepEqual(normalizeAction(canonicalWithNestedData), {
    type: 'openModal',
    data: { name: 'upgrade', data: { itemId: 7 } }
  });
  assert.deepEqual(normalizeAction(legacy), {
    type: 'select',
    data: { index: 3 }
  });
  assert.deepEqual(normalizeAction(wrapped), {
    type: 'equip',
    data: { slot: 'main' }
  });
  assert.deepEqual(flat, flatSnapshot);
  assert.deepEqual(legacy, legacySnapshot);
  assert.deepEqual(wrapped, wrappedSnapshot);

  assert.equal(normalizeAction(null), null);
  assert.equal(normalizeAction({}), null);
  assert.equal(normalizeAction({ type: '' }), null);
  assert.equal(normalizeAction({ type: 'button' }), null);
});

test('ActionRouter invokes exactly one registered handler and reports handled events', () => {
  const events = new EventManager();
  const router = new ActionRouter(events);
  const observed = [];
  const calls = [];
  events.on(EVENTS.ACTION_HANDLED, event => observed.push(event));
  const unregister = router.register('buy', (data, action) => {
    calls.push({ data, action });
    return data.amount * 2;
  });

  const raw = { type: 'buy', amount: 4 };
  const outcome = router.dispatch(raw);

  assert.deepEqual(outcome, {
    status: 'handled',
    action: { type: 'buy', data: { amount: 4 } },
    result: 8
  });
  assert.deepEqual(calls, [{
    data: { amount: 4 },
    action: { type: 'buy', data: { amount: 4 } }
  }]);
  assert.deepEqual(observed, [outcome]);
  assert.throws(() => router.register('buy', () => {}), /already registered/i);

  unregister();
  unregister();
  assert.equal(router.dispatch(raw).status, 'unhandled');
});

test('ActionRouter makes invalid and unknown actions observable', () => {
  const events = new EventManager();
  const router = new ActionRouter(events);
  const unhandled = [];
  events.on(EVENTS.ACTION_UNHANDLED, event => unhandled.push(event));

  const invalid = router.dispatch({ nope: true });
  const unknown = router.dispatch({ action: 'missing', data: { value: 1 } });

  assert.deepEqual(invalid, { status: 'invalid', action: null });
  assert.deepEqual(unknown, {
    status: 'unhandled',
    action: { type: 'missing', data: { value: 1 } }
  });
  assert.deepEqual(unhandled, [unknown]);
});

test('ActionRouter converts synchronous throws and asynchronous rejections to error outcomes', async () => {
  const events = new EventManager();
  const router = new ActionRouter(events);
  const observed = [];
  events.on(EVENTS.ACTION_ERROR, event => observed.push(event));
  const syncError = new Error('sync failure');
  const asyncError = new Error('async failure');
  router.register('sync', () => { throw syncError; });
  router.register('async', async () => { throw asyncError; });
  router.register('async-ok', async data => data.value + 1);

  const sync = router.dispatch({ type: 'sync' });
  const asyncFailure = await router.dispatch({ type: 'async' });
  const asyncSuccess = await router.dispatch({ type: 'async-ok', value: 4 });

  assert.equal(sync.status, 'error');
  assert.equal(sync.error, syncError);
  assert.equal(asyncFailure.status, 'error');
  assert.equal(asyncFailure.error, asyncError);
  assert.deepEqual(asyncSuccess, {
    status: 'handled',
    action: { type: 'async-ok', data: { value: 4 } },
    result: 5
  });
  assert.deepEqual(observed, [sync, asyncFailure]);
});

test('ActionRouter destroy disables commands without clearing shared events', () => {
  const events = new EventManager();
  const router = new ActionRouter(events);
  let commandCalls = 0;
  let sharedCalls = 0;
  events.on('shared', () => { sharedCalls += 1; });
  router.register('command', () => { commandCalls += 1; });

  router.destroy();
  router.destroy();
  const outcome = router.dispatch({ type: 'command' });
  events.emit('shared');

  assert.equal(outcome.status, 'invalid');
  assert.equal(outcome.action.type, 'command');
  assert.match(outcome.error.message, /destroyed/i);
  assert.equal(commandCalls, 0);
  assert.equal(sharedCalls, 1);
  assert.throws(() => router.register('later', () => {}), /destroyed/i);
});

test('ActionRouter destroys owned events and drops late async notifications', async () => {
  const owned = new ActionRouter(); let calls = 0;
  owned.events.on('owned', () => calls++); owned.destroy(); owned.events.emit('owned');
  assert.equal(calls, 0);
  const events = new EventManager(); const router = new ActionRouter(events);
  events.on(EVENTS.ACTION_HANDLED, () => calls++); events.on(EVENTS.ACTION_ERROR, () => calls++);
  let complete; let reject;
  router.register('success', () => new Promise((resolve) => { complete = resolve; }));
  router.register('failure', () => new Promise((_, fail) => { reject = fail; }));
  const success = router.dispatch({ type: 'success' }); const failure = router.dispatch({ type: 'failure' });
  router.destroy(); complete(1); reject(new Error('late'));
  assert.equal((await success).status, 'invalid'); assert.equal((await failure).status, 'invalid'); assert.equal(calls, 0);
});

test('EventEmitter accepts event names matching object prototype properties after reset', () => {
  const events = new EventEmitter(); let calls = 0;
  for (let round = 0; round < 2; round++) {
    events.on('__proto__', () => calls++); events.on('toString', () => calls++);
    events.emit('__proto__'); events.emit('toString'); events.removeAllListeners();
  }
  assert.equal(calls, 4);
});

for (const [name, create] of [
  ['EventEmitter', () => new EventEmitter()],
  ['EventManager', () => new EventManager()]
]) {
  test(`${name} subscriptions return idempotent cancellation functions`, () => {
    const events = create();
    let calls = 0;
    const cancel = events.on('tick', () => { calls += 1; });

    assert.equal(typeof cancel, 'function');
    cancel();
    cancel();
    events.emit('tick', {});

    assert.equal(calls, 0);
  });

  test(`${name} once is removed before re-entry and remains removed after errors`, () => {
    const events = create();
    let reentrantCalls = 0;
    events.once('reentrant', () => {
      reentrantCalls += 1;
      events.emit('reentrant', {});
    });
    events.emit('reentrant', {});
    assert.equal(reentrantCalls, 1);

    let errorCalls = 0;
    const expected = new Error('listener failure');
    events.once('error', () => {
      errorCalls += 1;
      throw expected;
    });
    assert.throws(() => events.emit('error', {}), expected);
    events.emit('error', {});
    assert.equal(errorCalls, 1);
  });

  test(`${name} does not confuse once and regular registrations of the same handler`, () => {
    const events = create();
    let calls = 0;
    const handler = () => { calls += 1; };
    events.on('tick', handler);
    events.once('tick', handler);

    events.emit('tick', {});
    events.emit('tick', {});

    assert.equal(calls, 3);
  });

  test(`${name} defers additions and skips listeners removed during dispatch`, () => {
    const events = create();
    const calls = [];
    const late = () => calls.push('late');
    const removed = () => calls.push('removed');
    events.on('tick', () => {
      calls.push('first');
      events.on('tick', late);
      events.off('tick', removed);
    });
    events.on('tick', removed);

    events.emit('tick', {});
    assert.deepEqual(calls, ['first']);
    events.emit('tick', {});
    assert.deepEqual(calls, ['first', 'first', 'late']);
  });
}

test('EventManager preserves listener context and propagation stopping', () => {
  const events = new EventManager();
  const context = { calls: 0 };
  const order = [];
  events.on('ui', function (event) {
    this.calls += 1;
    order.push('first');
    event.stopPropagation();
  }, context);
  events.on('ui', () => order.push('second'));

  events.emit('ui', { propagationStopped: false, stopPropagation() { this.propagationStopped = true; } });

  assert.equal(context.calls, 1);
  assert.deepEqual(order, ['first']);
});
