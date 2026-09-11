import { EventManager } from './engine/event.js';
import { UIManager } from './ui.js';
import { getPlatform, setPlatform } from './platform/index.js';
import { InputController } from './core/input.js';
import { JsonStore } from './core/storage.js';
import { ActionRouter } from './core/actionRouter.js';
import { EVENTS } from './core/actionTypes.js';
import { GAME_ACTIONS, GAME_EVENTS } from './game/actionTypes.js';
import { DemoView } from './ui/demoView.js';
import { ProgressView } from './ui/progressView.js';
import { ConfirmModal } from './ui/confirmModal.js';
import { DEMO, DEMO_SAVE_KEY, isDemoSave } from './data/demo.js';

export class Game {
  constructor(platform = getPlatform()) {
    this.platform = platform;
    setPlatform(platform);
    this.running = false;
    this.frameId = null;
    this.cleanups = [];
    this.destroyed = false;
    this.store = new JsonStore(platform.storage, DEMO_SAVE_KEY, isDemoSave);
    this.events = new EventManager();
    this.actions = new ActionRouter(this.events);
  }

  init() {
    this.state = this.store.load({ version: 1, clicks: 0 });
    this.canvas = this.platform.createCanvas();
    this.uiManager = new UIManager(this.canvas, 1, 1, { platform: this.platform, events: this.events });
    this.engine = this.uiManager;
    this.engine.theme.bg = '#111d28';
    this.engine.root.backgroundColor = 'transparent';
    this.view = new DemoView();
    this.uiManager.registerView('demo', this.view);
    this.uiManager.registerView('progress', new ProgressView());
    this.uiManager.registerModal('upgrade', () => new ConfirmModal());
    this.uiManager.setNavigation([{ view: 'demo', text: DEMO.training }, { view: 'progress', text: DEMO.progress }]);
    this.buttons = this.view.buttons;
    this.uiManager.bindActions(this.actions);
    this.actions.register(GAME_ACTIONS.INCREMENT, () => this.increment());
    this.actions.register(GAME_ACTIONS.EFFECT, () => {
      this.engine.particleSystem.explode(this.engine.width / 2, this.view.top + 135, { count: 20 });
    });
    this.actions.register(GAME_ACTIONS.CONFIRM_INCREMENT, () => {
      if (this.uiManager.modals.at(-1)?.name !== 'upgrade') return false;
      const next = this.increment();
      this.uiManager.closeModal('upgrade');
      return next;
    });
    this.events.on(EVENTS.ACTION_ERROR, ({ action, error }) => {
      console.error(error);
      const saving = action?.type === GAME_ACTIONS.INCREMENT || action?.type === GAME_ACTIONS.CONFIRM_INCREMENT;
      this.engine.notice(saving ? DEMO.failed : DEMO.actionFailed);
    });
    this.uiManager.onInteraction = (action) => this.handleAction(action);
    this.resize();
    this.cleanups.push(this.platform.onResize(() => this.resize()));
    this.cleanups.push(this.platform.onHide(() => this.onPause()));
    this.cleanups.push(this.platform.onShow(() => this.start()));
    this.start();
  }

  resize() {
    this.input?.cancel();
    const { width, height } = this.platform.getViewportSize();
    const safe = this.platform.getSafeArea();
    this.uiManager.resize(Math.max(1, width), Math.max(1, height), safe);
  }

  handleAction(action) {
    return this.actions.dispatch(action);
  }

  increment() {
    const next = { ...this.state, clicks: this.state.clicks + 1 };
    this.store.save(next);
    this.state = next;
    this.events.emit(GAME_EVENTS.PROGRESS_CHANGED, { clicks: next.clicks });
    this.engine.notice(DEMO.saved);
    return next;
  }

  start() {
    if (this.running || this.destroyed) return;
    if (!this.input) {
      this.input = new InputController(this.platform, this.canvas, this.uiManager, (action) => this.uiManager.onInteraction?.(action));
    }
    this.running = true;
    this.lastTime = this.platform.now();
    this.tick();
  }

  tick() {
    if (!this.running) return;
    const now = this.platform.now();
    const dt = Math.max(0, Math.min((now - this.lastTime) / 1000, 0.1));
    this.lastTime = now;
    this.uiManager.update(dt);
    this.uiManager.render(this.state);
    this.frameId = this.platform.requestAnimationFrame(() => this.tick());
  }

  onPause() {
    this.stop();
    const input = this.input;
    this.input = null;
    input?.destroy();
  }

  stop() {
    this.running = false;
    if (this.frameId !== null) this.platform.cancelAnimationFrame(this.frameId);
    this.frameId = null;
  }

  destroy() {
    this.destroyed = true;
    const steps = [() => this.stop(), () => this.input?.destroy(), ...this.cleanups.splice(0), () => this.uiManager?.destroy(), () => this.actions.destroy(), () => this.events.clear()];
    const errors = [];
    for (const step of steps) {
      try { step(); } catch (error) { errors.push(error); }
    }
    if (errors.length) throw errors[0];
  }
}
