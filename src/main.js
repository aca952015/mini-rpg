import { UIEngine, Button } from './engine/index.js';
import { getPlatform, setPlatform } from './platform/index.js';
import { InputController } from './core/input.js';
import { JsonStore } from './core/storage.js';
import { DemoView } from './ui/demoView.js';
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
  }

  init() {
    this.state = this.store.load({ version: 1, clicks: 0 });
    this.canvas = this.platform.createCanvas();
    this.engine = new UIEngine(this.canvas, 1, 1, { platform: this.platform, bindEvents: false });
    this.engine.theme.bg = '#111d28';
    this.engine.root.backgroundColor = 'transparent';
    this.view = new DemoView();
    this.engine.registerView('demo', this.view);
    this.buttons = [
      new Button({ text: DEMO.increment, action: 'demo_increment', height: 48, normalColor: '#806137' }),
      new Button({ text: DEMO.effect, action: 'demo_effect', height: 48, normalColor: '#284457' })
    ];
    this.buttons.forEach((button) => this.engine.addChild(button));
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
    this.engine.resize(Math.max(1, width), Math.max(1, height));
    this.view.layout(width, height, safe);
    this.buttons.forEach((button, index) => {
      button.x = safe.left + 24;
      button.width = Math.max(1, width - safe.left - safe.right - 48);
      button.y = height - safe.bottom - 140 + index * 62;
    });
  }

  handleAction(action) {
    const type = action.type || action.action;
    if (type === 'demo_increment') {
      const next = { ...this.state, clicks: this.state.clicks + 1 };
      try {
        this.store.save(next);
        this.state = next;
        this.engine.notice(DEMO.saved);
      } catch (error) {
        console.error(error);
        this.engine.notice(DEMO.failed);
      }
    } else if (type === 'demo_effect') {
      this.engine.particleSystem.explode(this.engine.width / 2, this.view.top + 135, { count: 20 });
    }
  }

  start() {
    if (this.running || this.destroyed) return;
    if (!this.input) {
      this.input = new InputController(this.platform, this.canvas, this.engine, (action) => this.handleAction(action));
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
    this.view.clicks = this.state.clicks;
    this.engine.update(dt);
    this.engine.render();
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
    const steps = [() => this.stop(), () => this.input?.destroy(), ...this.cleanups.splice(0), () => this.engine?.destroy()];
    const errors = [];
    for (const step of steps) {
      try { step(); } catch (error) { errors.push(error); }
    }
    if (errors.length) throw errors[0];
  }
}
