import test from 'node:test';
import assert from 'node:assert/strict';

import { Container } from '../src/engine/layout.js';
import { Emitter, ParticleSystem } from '../src/engine/particle.js';
import { ProgressBar } from '../src/engine/progressBar.js';
import { Sprite } from '../src/engine/sprite.js';
import { Tween } from '../src/engine/tween.js';
import { UIEngine } from '../src/engine/index.js';
import { Viewport } from '../src/engine/viewport.js';

function createContext(operations = []) {
  return {
    canvas: { width: 320, height: 640 },
    fillStyle: '#000000',
    font: '14px sans-serif',
    textAlign: 'left',
    textBaseline: 'middle',
    save() { operations.push('save'); },
    restore() { operations.push('restore'); },
    translate() {},
    scale() {},
    rotate() {},
    fillRect() { operations.push('fillRect'); },
    beginPath() {},
    rect() {},
    moveTo() {},
    lineTo() {},
    arcTo() {},
    closePath() {},
    fill() { operations.push('fill'); },
    stroke() {},
    fillText() {},
    drawImage() {}
  };
}

test('Emitter emits one particle and dispatches particleCreated once', () => {
  const emitter = new Emitter({ autoEmit: false, particleCount: 4 });
  let created = 0;
  emitter.on('particleCreated', () => { created += 1; });

  emitter.start();
  emitter.emit();

  assert.equal(emitter.particles.length, 1);
  assert.equal(created, 1);
});

test('ParticleSystem explosion is an update-driven burst with no wall-clock cleanup', () => {
  const originalSetTimeout = globalThis.setTimeout;
  let timerCalls = 0;
  globalThis.setTimeout = () => {
    timerCalls += 1;
    return 1;
  };

  try {
    const particles = new ParticleSystem();
    const emitter = particles.explode(10, 20, {
      count: 3,
      minLife: 10,
      maxLife: 10
    });

    assert.equal(timerCalls, 0);
    assert.equal(emitter.particles.length, 3);
    assert.equal(emitter.active, false);

    particles.pause();
    particles.resume();
    assert.equal(emitter.active, false);
    assert.equal(timerCalls, 0);
    particles.update(10);
    assert.equal(particles.emitters.length, 0);

    particles.destroy();
    assert.deepEqual(particles.emitters, []);
    assert.equal(timerCalls, 0);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test('vertical ProgressBar fills only its current percentage from the bottom', () => {
  const rects = [];
  const progress = new ProgressBar({
    x: 10,
    y: 20,
    width: 12,
    height: 200,
    value: 25,
    direction: 'vertical'
  });
  progress.drawRoundedRect = (_ctx, x, y, width, height) => {
    rects.push({ x, y, width, height });
  };

  progress.render(createContext());

  assert.deepEqual(rects[1], {
    x: 10,
    y: 170,
    width: 12,
    height: 50
  });
});

test('Sprite animation advances from dt seconds without wall-clock access', () => {
  const sprite = new Sprite({
    frames: [{}, {}, {}],
    frameTime: 100,
    playing: true
  });

  sprite.update(0.05);
  assert.equal(sprite.currentFrame, 0);
  sprite.update(0.05);
  assert.equal(sprite.currentFrame, 1);
  sprite.update(0.2);
  assert.equal(sprite.currentFrame, 0);
});

test('Tween chain methods remain callable and yoyo returns to the start', () => {
  const target = { x: 0 };
  const tween = new Tween(target, { duration: 100 });

  assert.equal(typeof tween.to, 'function');
  assert.equal(typeof tween.from, 'function');

  tween.from({ x: 0 }).to({ x: 10 }).play();
  tween.yoyo = true;
  tween.update(100);
  assert.equal(target.x, 10);
  assert.equal(tween.isPlaying, true);
  tween.update(50);
  assert.equal(target.x, 5);
  tween.update(50);
  assert.equal(target.x, 0);
  assert.equal(tween.isPlaying, false);
});

test('Container and Viewport render a direct 2D context', () => {
  const ctx = createContext();
  let containerChildRenders = 0;
  const container = new Container({ width: 100, height: 100 });
  container.ctx = ctx;
  container.addChild({
    width: 1,
    height: 1,
    _attachToParent() {},
    render(received) {
      assert.equal(received, ctx);
      containerChildRenders += 1;
    }
  });

  let viewportContentRenders = 0;
  class TestViewport extends Viewport {
    renderContent(received) {
      assert.equal(received, ctx);
      viewportContentRenders += 1;
    }
  }
  const viewport = new TestViewport({ width: 100, height: 100 });
  viewport.setContext(ctx);

  container.render(ctx);
  viewport.render(ctx);

  assert.equal(containerChildRenders, 1);
  assert.equal(viewportContentRenders, 1);
});

test('UIEngine root controls do not paint over the current view', () => {
  const operations = [];
  const ctx = createContext(operations);
  const platform = {
    now: () => 0,
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    createImage: () => ({})
  };
  const engine = new UIEngine(ctx, 320, 640, { bindEvents: false, platform });
  class TestViewport extends Viewport {
    renderContent() { operations.push('view'); }
  }
  engine.registerView('test', new TestViewport({ width: 320, height: 640 }));

  engine.render();

  assert.deepEqual(operations.filter(op => op === 'fillRect' || op === 'fill' || op === 'view'), [
    'fillRect',
    'view'
  ]);
});
