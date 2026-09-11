import { UIEngine, Button } from './engine/index.js';
import { UI_ACTIONS, EVENTS } from './core/actionTypes.js';

// Extracted from mini-mmo's shell/page/overlay policy. Game rules stay in action handlers.
export class UIManager extends UIEngine {
  constructor(canvas, width, height, options = {}) {
    super(canvas, width, height, { ...options, bindEvents: false });
    this.ownsEvents = !options.events;
    this.eventManager = options.events || this.eventManager;
    this.events = this.eventManager;
    this.views = Object.create(null);
    this.history = [];
    this.routeParams = undefined;
    this.modalFactories = new Map();
    this.modals = [];
    this.navigation = [];
    this.safeArea = { top: 0, right: 0, bottom: 0, left: 0 };
    this.inputRevision = 0;
    this.needsRender = true;
    this.destroyed = false;
    this.actionCleanups = [];
    this.renderModalLayers = (ctx) => {
      for (const { component } of this.modals) {
        ctx.save();
        try {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          ctx.fillRect(0, 0, this.width, this.height);
          component.render(ctx);
        } finally { ctx.restore(); }
      }
    };
  }

  assertAlive() {
    if (this.destroyed) throw new Error('UIManager is destroyed');
  }

  attach(component) {
    component._attachToParent?.(this.root);
    component.setContext?.(this.ctx);
  }

  registerView(name, view) {
    this.assertAlive();
    if (!name || this.views[name] || !view?.render) throw new Error(`Invalid or duplicate view: ${name}`);
    this.attach(view);
    this.views[name] = view;
    this.layoutView(view);
    if (!this.currentView) this.setCurrentView(name);
    return this;
  }

  setCurrentView(name, params, { replace = false } = {}) {
    this.assertAlive();
    const next = this.views[name];
    if (!next) throw new Error(`Unknown view: ${name}`);
    if (name === this.currentViewName) return this;
    const previous = this.currentViewName;
    this.closeAllModals();
    this.currentView?.onExit?.();
    if (previous && !replace) this.history.push({ name: previous, params: this.routeParams });
    this.currentView = next;
    this.currentViewName = name;
    this.routeParams = params;
    this.invalidateInput();
    next.onEnter?.(params);
    this.events.emit(EVENTS.VIEW_CHANGED, { name, previous, params });
    return this;
  }

  back() {
    if (this.modals.length) return this.closeModal();
    const route = this.history.at(-1);
    if (!route) return false;
    this.setCurrentView(route.name, route.params, { replace: true });
    this.history.pop();
    return true;
  }

  registerModal(name, factory) {
    this.assertAlive();
    if (!name || this.modalFactories.has(name) || typeof factory !== 'function') {
      throw new Error(`Invalid or duplicate modal: ${name}`);
    }
    this.modalFactories.set(name, factory);
    return this;
  }

  openModal(name, data, { closeOnBackdrop = false } = {}) {
    this.assertAlive();
    const factory = this.modalFactories.get(name);
    if (!factory) throw new Error(`Unknown modal: ${name}`);
    if (this.modals.some((modal) => modal.name === name)) return false;
    const component = factory(data);
    if (!component?.render) throw new Error(`Invalid modal component: ${name}`);
    try {
      this.attach(component);
      component.layout?.(this.width, this.height, this.safeArea);
      component.onEnter?.(data);
    } catch (error) {
      component.destroy?.();
      component._detachFromParent?.();
      throw error;
    }
    this.modals.push({ name, component, closeOnBackdrop });
    this.invalidateInput();
    this.events.emit(EVENTS.MODAL_OPENED, { name, data });
    return true;
  }

  closeModal(name) {
    const modal = this.modals.at(-1);
    // Only the top layer can close; a stale action cannot dismiss a newer dialog.
    if (!modal || (name && name !== modal.name)) return false;
    this.modals.pop();
    this.invalidateInput();
    try { modal.component.onExit?.(); }
    finally {
      try { modal.component.destroy?.(); }
      finally { modal.component._detachFromParent?.(); }
    }
    this.events.emit(EVENTS.MODAL_CLOSED, { name: modal.name });
    return true;
  }

  closeAllModals() {
    while (this.modals.length) this.closeModal();
  }

  getInputLayers() {
    return this.modals.length ? [this.modals.at(-1).component] : [this.root, this.currentView].filter(Boolean);
  }

  handleClick(x, y) {
    if (this.destroyed) return null;
    const modal = this.modals.at(-1);
    if (modal) {
      const inside = modal.component.contains?.(x, y) !== false;
      if (!inside) return modal.closeOnBackdrop ? { type: UI_ACTIONS.CLOSE_MODAL, name: modal.name } : null;
      return modal.component.handleClick?.(x, y) || null;
    }
    return this.root.handleClick(x, y) || this.currentView?.handleClick(x, y) || null;
  }

  invalidateInput() {
    this.inputRevision++;
    this.needsRender = true;
  }

  setNavigation(items) {
    this.assertAlive();
    for (const { view } of items) {
      if (!this.views[view]) throw new Error(`Unknown navigation view: ${view}`);
    }
    for (const { button } of this.navigation) this.root.removeChild(button);
    this.navigation = items.map(({ view, text }) => {
      const button = new Button({ text, action: UI_ACTIONS.SWITCH_VIEW, actionData: { view }, height: 44, normalColor: '#284457' });
      this.root.addChild(button);
      return { view, button };
    });
    this.resize(this.width, this.height, this.safeArea);
  }

  layoutView(view) {
    const safe = { ...this.safeArea, bottom: this.safeArea.bottom + (this.navigation.length ? 64 : 0) };
    if (view.layout) view.layout(this.width, this.height, safe);
    else view.resize?.(this.width, this.height);
  }

  resize(width, height, safe = this.safeArea) {
    super.resize(width, height);
    this.safeArea = { ...safe };
    Object.values(this.views).forEach((view) => this.layoutView(view));
    const available = Math.max(1, width - safe.left - safe.right - 32);
    this.navigation.forEach(({ button }, index) => {
      button.x = safe.left + 16 + index * available / this.navigation.length;
      button.y = height - safe.bottom - 52;
      button.width = Math.max(1, available / this.navigation.length - 8);
    });
    this.modals.forEach(({ component }) => component.layout?.(width, height, safe));
    this.invalidateInput();
  }

  bindActions(router) {
    const handlers = [
      [UI_ACTIONS.SWITCH_VIEW, ({ view, params, replace }) => { this.setCurrentView(view, params, { replace }); }],
      [UI_ACTIONS.BACK, () => this.back()],
      [UI_ACTIONS.OPEN_MODAL, ({ name, data, closeOnBackdrop }) => this.openModal(name, data, { closeOnBackdrop })],
      [UI_ACTIONS.CLOSE_MODAL, ({ name }) => this.closeModal(name)],
      [UI_ACTIONS.NOTICE, ({ message, options }) => { this.notice(message, options); }],
      [UI_ACTIONS.REFRESH, () => { this.needsRender = true; }]
    ];
    const cleanups = [];
    try { for (const [type, handler] of handlers) cleanups.push(router.register(type, handler)); }
    catch (error) { cleanups.forEach((cleanup) => cleanup()); throw error; }
    const cleanup = () => cleanups.splice(0).forEach((dispose) => dispose());
    this.actionCleanups.push(cleanup);
    return cleanup;
  }

  update(dt) {
    if (this.destroyed) return;
    super.update(dt);
    this.modals.forEach(({ component }) => component.update?.(dt));
  }

  render(viewData) {
    if (this.destroyed) return;
    this.currentView?.setData?.(viewData);
    this.modals.forEach(({ component }) => component.setData?.(viewData));
    this.navigation.forEach(({ button, view }) => { button.enabled = view !== this.currentViewName; });
    super.render(this.renderModalLayers);
    this.needsRender = false;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.invalidateInput();
    const errors = [];
    const run = (fn) => { try { fn(); } catch (error) { errors.push(error); } };
    while (this.modals.length) run(() => this.closeModal());
    run(() => this.currentView?.onExit?.());
    this.actionCleanups.splice(0).forEach((cleanup) => run(cleanup));
    Object.values(this.views).forEach((view) => { run(() => view.destroy?.()); run(() => view._detachFromParent?.()); });
    this.views = Object.create(null);
    this.currentView = null;
    this.currentViewName = '';
    this.history = [];
    this.modalFactories.clear();
    this.navigation = [];
    this.root.children.slice().forEach((child) => this.root.removeChild(child));
    if (this.ownsEvents) this.eventManager.clear();
    this.tweenManager.stopAll();
    this.noticeManager.clear();
    this.onInteraction = null;
    run(() => super.destroy());
    if (errors.length) throw errors[0];
  }
}
