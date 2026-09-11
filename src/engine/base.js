// UI Engine - 基础组件基类

// 默认颜色主题（用于 fallback）
const DEFAULT_COLORS = {
  bg: 'rgba(26, 20, 18, 0.5)',
  bgLight: 'rgba(45, 35, 30, 0.5)',
  bgDark: 'rgba(18, 13, 11, 0.5)',
  text: '#E1E1E1',
  textSecondary: '#8C7F73',
  accent: '#C43A3A',
  accentLight: '#E94560',
  gold: '#CDB089',
  green: '#5FB344',
  purple: '#A855F7',
  pink: '#FF69B4',
  attack: '#E94560',
  defense: '#3B9DFE',
  dodge: '#5FB344',
  physique: '#00FFE1',
  crit: '#E94560',
  critDamage: '#FFF200',
  combo: '#6366F1',
  power: '#CDB089',
  attackSpeed: '#FF69B4',
  panel: 'rgba(22, 33, 62, 0.5)',
  border: 'rgba(205, 176, 137, 0.3)'
};

export function isCanvasRenderingContext(value) {
  return Boolean(value) &&
    typeof value.save === 'function' &&
    typeof value.restore === 'function';
}

export class BaseComponent {
  constructor(options = {}) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.width = options.width || 100;
    this.height = options.height || 40;
    this.visible = options.visible !== false;
    this.enabled = options.enabled !== false;
    this.backgroundColor = options.backgroundColor || 'transparent';
    this.borderColor = options.borderColor || 'transparent';
    this.borderWidth = options.borderWidth || 0;
    this.borderRadius = options.borderRadius || 0;
    this.padding = options.padding || 0;
    this.opacity = options.opacity !== undefined ? options.opacity : 1;
    this.zIndex = options.zIndex || 0;

    // 事件处理
    this._eventListeners = {};

    // 子控件
    this.children = [];
    this.parent = null;

    // 渲染上下文（不通过构造函数传递，由父容器设置）
    this.ctx = null;
    this.canvas = null;

    // 颜色主题（使用默认主题）
    // 会通过 _attachToParent 从父容器获取 theme
    this.colors = DEFAULT_COLORS;

    // 顶部安全区域高度
    this.topSafeArea = 60;
    // 头像尺寸
    this.avatarSize = 50;
  }

  // 附加到父容器时调用，设置渲染上下文
  _attachToParent(parent) {
    if (parent) {
      this.ctx = parent.ctx || parent.canvas?.getContext('2d');
      this.canvas = parent.canvas || parent.ctx?.canvas;
      this.colors = parent.colors || this.colors;
    }

    // 递归设置所有子控件
    for (const child of this.children) {
      if (child._attachToParent) {
        child._attachToParent(this);
      }
    }
  }

  // 从父容器移除时调用
  _detachFromParent() {
    this.ctx = null;
    this.canvas = null;

    // 递归清除所有子控件的上下文
    for (const child of this.children) {
      if (child._detachFromParent) {
        child._detachFromParent();
      }
    }
  }

  // 添加子控件
  addChild(child) {
    child.parent = this;
    this.children.push(child);
    // 附加到父容器时设置上下文
    this._attachToParent(this);
    return child;
  }

  // 移除子控件
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
      child._detachFromParent();
    }
  }

  // 渲染方法（子类重写）
  render(ctxOrData) {
    // 兼容两种调用方式
    // 1. render(ctx) - 纯UI引擎方式
    // 2. render(viewData) - 兼容现有架构
    if (ctxOrData && typeof ctxOrData === 'object' && !isCanvasRenderingContext(ctxOrData)) {
      // viewData 方式由子类重写的 render 方法处理
      return;
    }

    const ctx = ctxOrData || this.ctx;
    if (!this.visible || !ctx) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    // 绘制背景
    this.renderBackground(ctx);

    // 绘制边框
    this.renderBorder(ctx);

    // 渲染子控件
    this.renderChildren(ctx);

    ctx.restore();
  }

  // 渲染背景
  renderBackground(ctx) {
    if (this.backgroundColor && this.backgroundColor !== 'transparent') {
      ctx.fillStyle = this.backgroundColor;
      this.drawRoundedRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
      ctx.fill();
    }
  }

  // 渲染边框
  renderBorder(ctx) {
    if (this.borderWidth > 0 && this.borderColor !== 'transparent') {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth;
      this.drawRoundedRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
      ctx.stroke();
    }
  }

  // 渲染子控件
  renderChildren(ctx) {
    // 子类可以重写
  }

  // 更新方法
  update(dt) {
    // 子类可以重写
  }

  // 检测点是否在控件范围内
  contains(x, y) {
    if (!this.visible) return false;

    const halfBorder = this.borderWidth / 2;
    return x >= this.x - halfBorder &&
           x <= this.x + this.width + halfBorder &&
           y >= this.y - halfBorder &&
           y <= this.y + this.height + halfBorder;
  }

  // 设置位置
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  // 设置尺寸
  setSize(width, height) {
    this.width = width;
    this.height = height;
  }

  // 响应视口尺寸变化；需要重排子组件的容器可在子类中覆盖并继续向下传播。
  resize(width, height) {
    this.setSize(width, height);
  }

  // 事件处理
  on(eventType, handler) {
    if (!this._eventListeners[eventType]) {
      this._eventListeners[eventType] = [];
    }
    this._eventListeners[eventType].push(handler);
  }

  off(eventType, handler) {
    if (!this._eventListeners[eventType]) return;

    if (handler) {
      const index = this._eventListeners[eventType].indexOf(handler);
      if (index !== -1) {
        this._eventListeners[eventType].splice(index, 1);
      }
    } else {
      this._eventListeners[eventType] = [];
    }
  }

  emit(eventType, event) {
    if (!this._eventListeners[eventType]) return;

    this._eventListeners[eventType].forEach(handler => {
      handler(event);
    });
  }

  // 派发事件到父控件
  dispatchEvent(eventType, event) {
    event = event || {};
    event.target = this;
    this.emit(eventType, event);

    if (event.bubbles !== false && this.parent) {
      this.parent.dispatchEvent(eventType, event);
    }
  }

  // 绘制圆角矩形（实例方法，使用 this.ctx）
  // 绘制圆角矩形
  // 参数: drawRoundedRect(ctx, x, y, width, height, radius)
  drawRoundedRect(ctx, x, y, width, height, radius) {
    if (!ctx) return;

    if (radius <= 0) {
      ctx.rect(x, y, width, height);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }
}
