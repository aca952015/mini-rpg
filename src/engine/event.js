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
    this._listeners = {};
  }

  // 添加事件监听
  on(type, handler) {
    if (!this._listeners[type]) {
      this._listeners[type] = [];
    }
    this._listeners[type].push(handler);
  }

  // 添加一次性事件监听
  once(type, handler) {
    const wrapper = (...args) => {
      handler.apply(this, args);
      this.off(type, wrapper);
    };
    this.on(type, wrapper);
  }

  // 移除事件监听
  off(type, handler) {
    if (!this._listeners[type]) return;
    const index = this._listeners[type].indexOf(handler);
    if (index !== -1) {
      this._listeners[type].splice(index, 1);
    }
  }

  // 触发事件
  emit(type, ...args) {
    if (!this._listeners[type]) return;
    this._listeners[type].forEach(handler => {
      handler.apply(this, args);
    });
  }

  // 移除所有事件监听
  removeAllListeners(type) {
    if (type) {
      delete this._listeners[type];
    } else {
      this._listeners = {};
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
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }

    this._listeners.get(type).push({
      handler,
      context,
      once: false
    });
  }

  // 添加一次性事件监听
  once(type, handler, context = null) {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }

    this._listeners.get(type).push({
      handler,
      context,
      once: true
    });
  }

  // 移除事件监听
  off(type, handler) {
    if (!handler) {
      // 移除所有该类型的事件监听
      this._listeners.delete(type);
      return;
    }

    const listeners = this._listeners.get(type);
    if (!listeners) return;

    for (let i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i].handler === handler) {
        listeners.splice(i, 1);
      }
    }
  }

  // 触发事件
  emit(type, event) {
    const listeners = this._listeners.get(type);
    if (!listeners) return;

    // 复制数组，避免在遍历时修改数组
    const toCall = [...listeners];

    for (const listener of toCall) {
      if (listener.once) {
        this.off(type, listener.handler);
      }

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
    this._listeners.clear();
  }
}
