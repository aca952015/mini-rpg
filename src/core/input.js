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
      hover: ({ x, y }) => engine.root.handleMouseMove(x, y),
      leave: () => this.cancel()
    });
  }

  start(point) {
    this.cancel();
    const rootOwner = findScrollOwner(this.engine.root, point.x, point.y);
    const rootCaptured = rootOwner
      ? false
      : this.engine.root.handleMouseDown(point.x, point.y);
    const scrollOwner = rootOwner || (!rootCaptured
      ? findScrollOwner(this.engine.currentView, point.x, point.y)
      : null);
    this.gesture = {
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
    g.dragged ||= Math.hypot(point.x - g.start.x, point.y - g.start.y) > 10;
    if (g.dragged) {
      clearPressed(this.engine.root);
      clearPressed(this.engine.currentView);
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
    const { dragged } = this.gesture;
    this.cancel();
    if (dragged) return;
    // Root overlays have priority over the underlying view.
    const action = this.engine.root.handleClick(point.x, point.y)
      || this.engine.currentView?.handleClick(point.x, point.y);
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
    this.gesture = null;
    clearPressed(this.engine.root);
    clearPressed(this.engine.currentView);
  }

  destroy() {
    this.cancel();
    const unsubscribe = this.unsubscribe;
    this.unsubscribe = null;
    unsubscribe?.();
  }
}
