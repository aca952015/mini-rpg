// UI Engine - 事件类型定义

export const EventType = {
  // 鼠标事件
  CLICK: 'click',
  MOUSEDOWN: 'mousedown',
  MOUSEUP: 'mouseup',
  MOUSEMOVE: 'mousemove',
  MOUSEENTER: 'mouseenter',
  MOUSELEAVE: 'mouseleave',

  // 触摸事件
  TOUCHSTART: 'touchstart',
  TOUCHEND: 'touchend',
  TOUCHMOVE: 'touchmove',

  // 控件事件
  CHANGE: 'change',
  SCROLL: 'scroll',
  TABCHANGE: 'tabchange',
  ITEMCLICK: 'itemclick',
  ITEMSELECT: 'itemselect',

  // 键盘事件
  KEYDOWN: 'keydown',
  KEYUP: 'keyup',

  // 焦点事件
  FOCUS: 'focus',
  BLUR: 'blur'
};

// 事件类
export class UIEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.target = options.target || null;
    this.currentTarget = options.currentTarget || null;
    this.bubbles = options.bubbles !== false;
    this.defaultPrevented = false;
    this.propagationStopped = false;

    // 鼠标/触摸数据
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.deltaX = options.deltaX || 0;
    this.deltaY = options.deltaY || 0;
    this.button = options.button || 0;

    // 键盘数据
    this.key = options.key || '';
    this.keyCode = options.keyCode || 0;

    // 自定义数据
    this.data = options.data || null;
  }

  // 阻止默认行为
  preventDefault() {
    this.defaultPrevented = true;
  }

  // 停止传播
  stopPropagation() {
    this.propagationStopped = true;
  }
}

// 事件发射器（用于组件）
export class EventEmitter {
  constructor() {
    this._listeners = Object.create(null);
  }

  // 添加事件监听
  on(type, handler) {
    return this._addListener(type, handler, false);
  }

  // 添加一次性事件监听
  once(type, handler) {
    return this._addListener(type, handler, true);
  }

  _addListener(type, handler, once) {
    if (!this._listeners[type]) this._listeners[type] = [];
    const listener = { handler, once, active: true };
    this._listeners[type].push(listener);

    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      this._removeListener(type, listener);
    };
  }

  _removeListener(type, listener) {
    listener.active = false;
    const listeners = this._listeners[type];
    if (!listeners) return;
    const index = listeners.indexOf(listener);
    if (index !== -1) listeners.splice(index, 1);
    if (listeners.length === 0) delete this._listeners[type];
  }

  // 移除事件监听
  off(type, handler) {
    const listeners = this._listeners[type];
    if (!listeners) return;
    const listener = listeners.find(candidate => candidate.handler === handler);
    if (listener) this._removeListener(type, listener);
  }

  // 触发事件
  emit(type, ...args) {
    const listeners = this._listeners[type];
    if (!listeners) return;

    for (const listener of [...listeners]) {
      if (!listener.active) continue;
      if (listener.once) this._removeListener(type, listener);
      listener.handler.apply(this, args);
    }
  }

  // 移除所有事件监听
  removeAllListeners(type) {
    if (type) {
      const listeners = this._listeners[type] || [];
      for (const listener of listeners) listener.active = false;
      delete this._listeners[type];
    } else {
      for (const listeners of Object.values(this._listeners)) {
        for (const listener of listeners) listener.active = false;
      }
      this._listeners = Object.create(null);
    }
  }
}

// 事件管理器
export class EventManager {
  constructor() {
    this._listeners = new Map();
  }

  // 添加事件监听
  on(type, handler, context = null) {
    return this._addListener(type, handler, context, false);
  }

  // 添加一次性事件监听
  once(type, handler, context = null) {
    return this._addListener(type, handler, context, true);
  }

  _addListener(type, handler, context, once) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    const listener = { handler, context, once, active: true };
    this._listeners.get(type).push(listener);

    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      this._removeListener(type, listener);
    };
  }

  _removeListener(type, listener) {
    listener.active = false;
    const listeners = this._listeners.get(type);
    if (!listeners) return;
    const index = listeners.indexOf(listener);
    if (index !== -1) listeners.splice(index, 1);
    if (listeners.length === 0) this._listeners.delete(type);
  }

  // 移除事件监听
  off(type, handler) {
    if (!handler) {
      // 移除所有该类型的事件监听
      const listeners = this._listeners.get(type) || [];
      for (const listener of listeners) listener.active = false;
      this._listeners.delete(type);
      return;
    }

    const listeners = this._listeners.get(type);
    if (!listeners) return;

    for (let i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i].handler === handler) {
        listeners[i].active = false;
        listeners.splice(i, 1);
      }
    }
    if (listeners.length === 0) this._listeners.delete(type);
  }

  // 触发事件
  emit(type, event) {
    const listeners = this._listeners.get(type);
    if (!listeners) return;

    // 复制数组，避免在遍历时修改数组
    const toCall = [...listeners];

    for (const listener of toCall) {
      if (!listener.active) continue;
      if (listener.once) this._removeListener(type, listener);

      if (listener.context) {
        listener.handler.call(listener.context, event);
      } else {
        listener.handler(event);
      }

      // 如果停止了传播，退出
      if (event && event.propagationStopped) {
        break;
      }
    }
  }

  // 清空所有事件监听
  clear() {
    for (const listeners of this._listeners.values()) {
      for (const listener of listeners) listener.active = false;
    }
    this._listeners.clear();
  }
}
