import test from 'node:test';
import assert from 'node:assert/strict';
import { UIManager } from '../src/ui.js';
import { Container, Viewport, Button, ListView, EventManager } from '../src/engine/index.js';
import { InputController } from '../src/core/input.js';
import { ActionRouter } from '../src/core/actionRouter.js';
import { UI_ACTIONS, EVENTS } from '../src/core/actionTypes.js';

function fixture() {
  const calls = [];
  const ctx = new Proxy({ measureText: () => ({ width: 20 }) }, { get: (target, key) => key in target ? target[key] : () => {} });
  const canvas = { getContext: () => ctx }; ctx.canvas = canvas;
  const events = new EventManager();
  const ui = new UIManager(canvas, 390, 844, { platform: {}, events });
  const actions = new ActionRouter(events);
  ui.bindActions(actions);
  let handlers;
  const input = new InputController({ bindInput: (_, callbacks) => { handlers = callbacks; return () => {}; } }, canvas, ui, (action) => calls.push(actions.dispatch(action)));
  const click = (x, y) => { handlers.start({ x, y }); handlers.end({ x, y }); };
  return { ui, actions, events, input, handlers, click, calls };
}

test('页面切换保留返回参数，首次进入/重复选择/返回的生命周期与事件各一次', () => {
  const { ui, actions, events } = fixture();
  const visits = []; const changes = [];
  const page = (name) => Object.assign(new Viewport(), {
    onEnter: (params) => visits.push(['enter', name, params]), onExit: () => visits.push(['exit', name])
  });
  const unsubscribe = ui.on(EVENTS.VIEW_CHANGED, (event) => changes.push(event));
  assert.equal(ui.events, events);
  ui.registerView('one', page('one')); ui.registerView('two', page('two')); ui.registerView('three', page('three'));
  actions.dispatch({ type: UI_ACTIONS.SWITCH_VIEW, view: 'two', params: { tab: 'gear' } });
  actions.dispatch({ type: UI_ACTIONS.SWITCH_VIEW, view: 'two' });
  actions.dispatch({ type: UI_ACTIONS.SWITCH_VIEW, view: 'three' });
  actions.dispatch({ type: UI_ACTIONS.BACK });
  assert.equal(ui.currentViewName, 'two');
  assert.deepEqual(ui.routeParams, { tab: 'gear' });
  assert.equal(changes.length, 4);
  assert.equal(visits.filter(([kind]) => kind === 'enter').length, 4);
  assert.throws(() => ui.setCurrentView('missing'), /Unknown view/);
  assert.equal(ui.currentViewName, 'two');
  unsubscribe();
  ui.destroy(); actions.destroy();
});

test('弹窗空白区域和拖动阻断页面/导航，栈顶关闭后恢复上一层', () => {
  const { ui, actions, click, handlers } = fixture();
  const view = new Viewport();
  const list = view.addChild(new ListView({ x: 0, y: 0, width: 180, height: 200, itemHeight: 30 }));
  list.setItems(Array.from({ length: 20 }, (_, id) => ({ id })));
  ui.registerView('one', view); ui.registerView('two', new Viewport());
  ui.setNavigation([{ view: 'two', text: 'Next' }]);
  let underlying = 0; let top = 0;
  actions.register('underlying', () => underlying++); actions.register('top', () => top++);
  ui.root.addChild(new Button({ x: 10, y: 10, width: 80, action: 'underlying' }));
  const modal = (action) => {
    const panel = new Container({ x: 80, y: 220, width: 220, height: 180 });
    panel.addChild(new Button({ x: 10, y: 10, action })); return panel;
  };
  ui.registerModal('first', () => modal('underlying'));
  ui.registerModal('second', () => modal('top'));
  ui.openModal('first'); ui.openModal('second');
  click(20, 20); click(20, 800);
  handlers.start({ x: 30, y: 140 }); handlers.move({ x: 30, y: 100 }); handlers.end({ x: 30, y: 100 });
  assert.equal(list.scrollY, 0); assert.equal(underlying, 0); assert.equal(ui.currentViewName, 'one');
  click(95, 235); assert.equal(top, 1); assert.equal(underlying, 0);
  assert.equal(ui.closeModal('first'), false);
  actions.dispatch({ type: UI_ACTIONS.BACK });
  click(95, 235); assert.equal(underlying, 1);
  ui.closeModal(); click(20, 20); assert.equal(underlying, 2);
  ui.destroy(); actions.destroy();
});

test('弹窗内嵌套列表仍可滚动，取消和层级变化不会向新页面误发点击', () => {
  const { ui, actions, handlers } = fixture();
  const view = new Viewport(); let hits = 0;
  view.addChild(new Button({ x: 0, y: 0, width: 390, height: 844, action: 'hit' }));
  actions.register('hit', () => hits++); ui.registerView('one', view);
  let list;
  ui.registerModal('scroll', () => {
    const panel = new Container({ x: 20, y: 100, width: 250, height: 220 });
    list = panel.addChild(new ListView({ x: 10, y: 10, width: 200, height: 160, itemHeight: 30 }));
    list.setItems(Array.from({ length: 20 }, (_, id) => ({ id }))); return panel;
  });
  ui.openModal('scroll');
  handlers.start({ x: 80, y: 180 }); handlers.move({ x: 80, y: 140 }); handlers.cancel(); handlers.end({ x: 80, y: 140 });
  assert.equal(list.scrollY, 40); assert.equal(hits, 0);
  handlers.start({ x: 80, y: 140 }); ui.closeModal(); handlers.end({ x: 80, y: 140 });
  assert.equal(hits, 0);
  handlers.start({ x: 80, y: 140 }); ui.openModal('scroll'); handlers.end({ x: 80, y: 140 });
  assert.equal(list.scrollY, 0); assert.equal(hits, 0);
  ui.destroy(); actions.destroy();
});

test('弹窗工厂按需创建、接收data，重复打开不重复创建；遮罩关闭只关一层', () => {
  const { ui, actions, click } = fixture();
  let created = 0; let disposed = 0; let received;
  ui.registerView('one', new Viewport());
  ui.registerModal('detail', (data) => {
    created++; received = data;
    return Object.assign(new Container({ x: 100, y: 100, width: 100, height: 100 }), { destroy() { disposed++; } });
  });
  assert.equal(created, 0);
  const result = actions.dispatch({ type: UI_ACTIONS.OPEN_MODAL, name: 'detail', data: { item: 7 }, closeOnBackdrop: true });
  assert.equal(result.status, 'handled'); assert.deepEqual(received, { item: 7 });
  ui.openModal('detail'); assert.equal(created, 1);
  click(5, 5); assert.equal(ui.modals.length, 0); assert.equal(disposed, 1);
  ui.openModal('detail'); assert.equal(created, 2);
  ui.destroy(); ui.destroy(); assert.equal(disposed, 2);
  assert.equal(actions.dispatch({ type: UI_ACTIONS.OPEN_MODAL, name: 'detail' }).status, 'unhandled');
  actions.destroy();
});

test('绘制保持页面/壳层/弹窗/通知顺序，resize传播安全区且只有一轮update', () => {
  const { ui, actions } = fixture();
  const order = []; const updates = []; const sizes = [];
  const view = Object.assign(new Viewport(), {
    render: () => order.push('view'), update: () => updates.push('view'),
    layout: (...args) => sizes.push(['view', ...args]), setData: (data) => assert.equal(data.clicks, 3)
  });
  ui.registerView('one', view);
  ui.registerModal('modal', () => Object.assign(new Container(), {
    render: () => order.push('modal'), update: () => updates.push('modal'), layout: (...args) => sizes.push(['modal', ...args])
  }));
  ui.setNavigation([{ view: 'one', text: 'One' }]); ui.openModal('modal');
  ui.root.render = () => order.push('root'); ui.noticeManager.render = () => order.push('notice');
  ui.resize(320, 640, { top: 32, bottom: 20, left: 4, right: 8 });
  ui.update(0.016); ui.render({ clicks: 3 });
  assert.deepEqual(order, ['view', 'root', 'modal', 'notice']); assert.deepEqual(updates, ['view', 'modal']);
  assert.deepEqual(sizes.at(-2), ['view', 320, 640, { top: 32, bottom: 84, left: 4, right: 8 }]);
  assert.deepEqual(sizes.at(-1), ['modal', 320, 640, { top: 32, bottom: 20, left: 4, right: 8 }]);
  ui.destroy(); actions.destroy();
});

test('销毁即使页面清理抛错仍释放其他页面、路由和事件，外部事件由调用方持有', () => {
  const { ui, actions, events } = fixture();
  let destroyed = 0; let external = 0;
  events.on('external', () => external++);
  ui.registerView('one', Object.assign(new Viewport(), { destroy() { throw new Error('cleanup'); } }));
  ui.registerView('two', Object.assign(new Viewport(), { destroy() { destroyed++; } }));
  assert.throws(() => ui.destroy(), /cleanup/);
  assert.equal(destroyed, 1); assert.equal(ui.currentView, null); assert.equal(ui.root.children.length, 0);
  assert.equal(actions.dispatch({ type: UI_ACTIONS.BACK }).status, 'unhandled');
  events.emit('external'); assert.equal(external, 1);
  ui.destroy(); actions.destroy(); events.clear();
});

test('小于拖动阈值的跨边界释放不会误触按钮或关闭弹窗', () => {
  const { ui, actions, handlers, click } = fixture();
  const view = new Viewport(); const hits = [];
  const first = view.addChild(new Button({ x: 10, y: 10, width: 80, height: 40, action: 'first' }));
  view.addChild(new Button({ x: 91, y: 10, width: 80, height: 40, action: 'second' }));
  actions.register('first', () => hits.push('first')); actions.register('second', () => hits.push('second'));
  ui.registerView('one', view);
  handlers.start({ x: 5, y: 20 }); handlers.end({ x: 10, y: 20 });
  handlers.start({ x: 88, y: 20 }); handlers.end({ x: 94, y: 20 });
  assert.deepEqual(hits, []);
  handlers.start({ x: 20, y: 20 }); assert.equal(first._isPressed, true);
  handlers.end({ x: 24, y: 20 }); assert.deepEqual(hits, ['first']); assert.equal(first._isPressed, false);
  ui.registerModal('edge', () => new Container({ x: 100, y: 100, width: 100, height: 100 }));
  ui.openModal('edge', null, { closeOnBackdrop: true });
  handlers.start({ x: 103, y: 150 }); handlers.end({ x: 98, y: 150 });
  assert.equal(ui.modals.length, 1);
  click(10, 100); assert.equal(ui.modals.length, 0);
  ui.destroy(); actions.destroy();
});
