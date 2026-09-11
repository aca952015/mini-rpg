import { Container } from '../engine/layout.js';
import { ListView } from '../engine/listView.js';
import { ScrollView } from '../engine/scrollView.js';
import { Viewport } from '../engine/viewport.js';

function clearPressed(component) {
  if (!component) return;
  if ('_isPressed' in component) component._isPressed = false;
  if ('_isDragging' in component) component._isDragging = false;
  component.children?.forEach(clearPressed);
  clearPressed(component.content);
}

function isAvailable(component) {
  return Boolean(component) && component.visible !== false && component.enabled !== false;
}

// Resolve click identity without calling handleClick (which may change selection or emit events).
function findClickTarget(component, x, y) {
  if (!isAvailable(component) || component.contains?.(x, y) === false) return null;
  if (component instanceof Viewport || component instanceof Container) {
    const localX = component instanceof Viewport ? x + component.scrollOffset.x : x - component.x;
    const localY = component instanceof Viewport ? y + component.scrollOffset.y : y - component.y;
    for (let index = component.children.length - 1; index >= 0; index--) {
      const hit = findClickTarget(component.children[index], localX, localY);
      if (hit) return hit;
    }
    const baseHandler = component instanceof Viewport ? Viewport.prototype.handleClick : Container.prototype.handleClick;
    if (component.handleClick === baseHandler) return null;
  }
  if (component instanceof ScrollView) {
    return findClickTarget(component.content, x + component.scrollX - component.x, y + component.scrollY - component.y);
  }
  if (component instanceof ListView) {
    const key = component._getItemIndexAt(y);
    if (key < 0 || key >= component._sortedItems.length) return null;
    return { component, key, x, y };
  }
  return component.handleClick ? { component, x, y } : null;
}

function findScrollOwner(component, x, y) {
  if (!isAvailable(component) || (component.contains && !component.contains(x, y))) {
    return null;
  }

  if (component instanceof Viewport) {
    const childX = x + component.scrollOffset.x;
    const childY = y + component.scrollOffset.y;
    for (let index = component.children.length - 1; index >= 0; index--) {
      const hit = findScrollOwner(component.children[index], childX, childY);
      if (hit) return hit;
    }
    return null;
  }

  if (component instanceof Container) {
    const childX = x - component.x;
    const childY = y - component.y;
    for (let index = component.children.length - 1; index >= 0; index--) {
      const hit = findScrollOwner(component.children[index], childX, childY);
      if (hit) return hit;
    }
    return null;
  }

  if (component instanceof ScrollView) {
    if (component.content) {
      const contentX = x + component.scrollX - component.x;
      const contentY = y + component.scrollY - component.y;
      const nested = findScrollOwner(component.content, contentX, contentY);
      if (nested) return nested;
    }
    return component.maxScrollX > 0 || component.maxScrollY > 0
      ? { owner: component, x, y, type: 'scrollView' }
      : null;
  }

  if (component instanceof ListView && component.maxScrollY > 0) {
    return { owner: component, x, y, type: 'listView' };
  }

  return null;
}

// A pointer release dispatches exactly one click; cancellation never dispatches.
export class InputController {
  constructor(platform, canvas, engine, onAction) {
    this.engine = engine;
    this.onAction = onAction;
    this.gesture = null;
    this.unsubscribe = platform.bindInput(canvas, {
      start: (point) => this.start(point),
      move: (point) => this.move(point),
      end: (point) => this.end(point),
      cancel: () => this.cancel(),
      hover: ({ x, y }) => this.layers()[0]?.handleMouseMove?.(x, y),
      leave: () => this.cancel()
    });
  }

  layers() {
    return this.engine.getInputLayers?.() || [this.engine.root, this.engine.currentView].filter(Boolean);
  }

  clickTarget(layers, point) {
    for (const layer of layers) {
      const target = findClickTarget(layer, point.x, point.y);
      if (target) return target;
    }
    return null;
  }

  start(point) {
    this.cancel();
    const layers = this.layers();
    const pressTarget = this.clickTarget(layers, point);
    let scrollOwner = null;
    for (const layer of layers) {
      scrollOwner = findScrollOwner(layer, point.x, point.y);
      if (scrollOwner || findClickTarget(layer, point.x, point.y)) break;
    }
    // Press only the resolved control, never ScrollView.handleMouseDown, which invokes content clicks.
    if (pressTarget && !(pressTarget.component instanceof ListView)) {
      pressTarget.component.handleMouseDown?.(pressTarget.x, pressTarget.y);
    }
    this.gesture = {
      layers,
      pressTarget,
      boundaries: layers.map((layer) => layer.contains?.(point.x, point.y) !== false),
      revision: this.engine.inputRevision,
      start: point,
      last: point,
      dragged: false,
      scrollOwner,
      ownerOffset: scrollOwner
        ? { x: scrollOwner.x - point.x, y: scrollOwner.y - point.y }
        : null
    };
  }

  move(point) {
    const g = this.gesture;
    if (!g) return;
    if (g.revision !== this.engine.inputRevision) { this.cancel(); return; }
    g.dragged ||= Math.hypot(point.x - g.start.x, point.y - g.start.y) > 10;
    if (g.dragged) {
      g.layers.forEach(clearPressed);
      if (g.scrollOwner) {
        const ownerX = point.x + g.ownerOffset.x;
        const ownerY = point.y + g.ownerOffset.y;
        const deltaX = point.x - g.last.x;
        const deltaY = point.y - g.last.y;
        if (g.scrollOwner.type === 'listView') {
          g.scrollOwner.owner.handleDrag(ownerX, ownerY, deltaY);
        } else {
          g.scrollOwner.owner.handleDrag(ownerX, ownerY, deltaX, deltaY);
        }
      }
    }
    g.last = point;
  }

  end(point) {
    if (!this.gesture) return;
    this.move(point);
    if (!this.gesture) return;
    const { dragged, pressTarget, layers, boundaries } = this.gesture;
    const releaseTarget = this.clickTarget(layers, point);
    const sameTarget = pressTarget?.component === releaseTarget?.component && pressTarget?.key === releaseTarget?.key;
    const sameBoundary = layers.every((layer, index) => (layer.contains?.(point.x, point.y) !== false) === boundaries[index]);
    this.cancel();
    if (dragged || !sameTarget || !sameBoundary) return;
    // Root overlays have priority over the underlying view.
    let action;
    if (this.engine.handleClick) action = this.engine.handleClick(point.x, point.y);
    else {
      for (const layer of this.layers()) {
        action = layer.handleClick?.(point.x, point.y);
        if (action) break;
      }
    }
    if (action && typeof action === 'object') this.onAction(action);
  }

  cancel() {
    const scrollOwner = this.gesture?.scrollOwner;
    if (scrollOwner) {
      const last = this.gesture.last;
      scrollOwner.owner.handleMouseUp?.(
        last.x + this.gesture.ownerOffset.x,
        last.y + this.gesture.ownerOffset.y
      );
    }
    this.gesture?.layers.forEach(clearPressed);
    this.gesture = null;
    this.layers().forEach(clearPressed);
  }

  destroy() {
    this.cancel();
    const unsubscribe = this.unsubscribe;
    this.unsubscribe = null;
    unsubscribe?.();
  }
}
