import test from 'node:test';
import assert from 'node:assert/strict';

import { InputController } from '../src/core/input.js';
import { Container } from '../src/engine/layout.js';
import { ListView } from '../src/engine/listView.js';
import { ScrollView } from '../src/engine/scrollView.js';
import { Viewport } from '../src/engine/viewport.js';
import { Button } from '../src/engine/button.js';

function createHarness() {
  let handlers;
  const actions = [];
  const platform = {
    bindInput(_canvas, inputHandlers) {
      handlers = inputHandlers;
      return () => {};
    }
  };
  const root = new Container({ x: 0, y: 0, width: 320, height: 640 });
  const currentView = new Viewport({ width: 320, height: 640 });
  const engine = { root, currentView };
  const input = new InputController(platform, {}, engine, action => actions.push(action));
  return { actions, currentView, handlers, input, root };
}

function createList(options = {}) {
  const list = new ListView({
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 120,
    height: options.height ?? 100,
    itemHeight: 25,
    visible: options.visible,
    enabled: options.enabled
  });
  list.setItems(Array.from({ length: 12 }, (_, index) => ({ index })));
  return list;
}

test('drag scrolls a ListView inside the current Viewport without clicking', () => {
  const { actions, currentView, handlers } = createHarness();
  const list = createList({ x: 20, y: 100 });
  currentView.addChild(list);

  handlers.start({ x: 50, y: 140 });
  handlers.move({ x: 50, y: 105 });
  handlers.end({ x: 50, y: 105 });

  assert.equal(list.scrollY, 35);
  assert.deepEqual(actions, []);
  assert.equal(list._isDragging, false);
});

test('drag uses ScrollView coordinates through a nested Container', () => {
  const { actions, currentView, handlers } = createHarness();
  const wrapper = new Container({ x: 10, y: 20, width: 250, height: 300 });
  const scroll = new ScrollView({ x: 30, y: 40, width: 120, height: 100 });
  scroll.setContent({ width: 120, height: 300 });
  wrapper.addChild(scroll);
  currentView.addChild(wrapper);

  handlers.start({ x: 70, y: 90 });
  handlers.move({ x: 60, y: 55 });
  handlers.end({ x: 60, y: 55 });

  assert.equal(scroll.scrollX, 0);
  assert.equal(scroll.scrollY, 35);
  assert.deepEqual(actions, []);
  assert.equal(scroll._isDragging, false);
});

test('root scroll owner wins and hidden or disabled controls are skipped', () => {
  const { currentView, handlers, root } = createHarness();
  const viewList = createList({ x: 20, y: 100 });
  const hiddenRootList = createList({ x: 20, y: 100, visible: false });
  const disabledRootList = createList({ x: 20, y: 100, enabled: false });
  const rootList = createList({ x: 20, y: 100 });
  currentView.addChild(viewList);
  root.addChild(hiddenRootList);
  root.addChild(disabledRootList);
  root.addChild(rootList);

  handlers.start({ x: 50, y: 140 });
  handlers.move({ x: 50, y: 110 });
  handlers.end({ x: 50, y: 110 });

  assert.equal(rootList.scrollY, 30);
  assert.equal(hiddenRootList.scrollY, 0);
  assert.equal(disabledRootList.scrollY, 0);
  assert.equal(viewList.scrollY, 0);
});

test('cancel clears the scroll owner and a later release cannot click', () => {
  const { actions, currentView, handlers, input } = createHarness();
  const list = createList({ x: 20, y: 100 });
  currentView.addChild(list);

  handlers.start({ x: 50, y: 140 });
  handlers.move({ x: 50, y: 110 });
  handlers.cancel();
  handlers.end({ x: 50, y: 110 });

  assert.equal(list.scrollY, 30);
  assert.equal(list._isDragging, false);
  assert.deepEqual(actions, []);
  assert.equal(input.gesture, null);
});

test('ScrollView content buttons activate on release once, and remain scrollable', () => {
  const { actions, currentView, handlers } = createHarness();
  const scroll = new ScrollView({ x: 20, y: 100, width: 180, height: 100 });
  const content = new Container({ width: 180, height: 300 });
  const button = content.addChild(new Button({ x: 10, y: 10, width: 100, height: 60, action: 'select' }));
  scroll.setContent(content); currentView.addChild(scroll);
  let clicks = 0; button.on('click', () => clicks++);
  handlers.start({ x: 50, y: 140 }); assert.equal(clicks, 0); assert.equal(button._isPressed, true);
  handlers.end({ x: 50, y: 140 }); assert.equal(clicks, 1); assert.deepEqual(actions, [{ type: 'select' }]);
  handlers.start({ x: 50, y: 150 }); handlers.move({ x: 50, y: 120 }); handlers.end({ x: 50, y: 120 });
  assert.equal(clicks, 1); assert.equal(actions.length, 1); assert.equal(scroll.scrollY, 30);
});
