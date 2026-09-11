// UI Engine - 视口/场景视图基类
//
// 设计规范:
// 1. 所有游戏视图(Scene)都应继承自Viewport
// 2. 所有子控件都应通过 addChild() 方法添加
// 3. 事件处理通过组件的 contains 方法检测
// 4. 渲染时自动渲染所有子控件
//
// 兼容模式:
// 支持两种构造方式:
// - Viewport(options) - 纯UI引擎方式
// - Viewport(ctx, width, height) - 兼容现有游戏架构方式

import { Container } from './layout.js';
import { BaseComponent, isCanvasRenderingContext } from './base.js';

export class Viewport extends BaseComponent {
  constructor(options = {}) {
    // 调用父类构造函数
    super(options);

    // 视口特有属性
    this.name = options.name || 'viewport';
    this.visible = options.visible !== false;
    this.enabled = options.enabled !== false;

    // 尺寸属性
    this.width = options.width || 800;
    this.height = options.height || 600;

    // 子控件（使用数组存储，兼容现有架构）
    this.children = [];

    // 滚动偏移
    this.scrollOffset = { x: 0, y: 0 };

    // 事件回调（子控件触发 action 时自动调用）
    this.onAction = options.onAction || null;

    // 颜色主题（从 options 传入，仅在传入时覆盖默认颜色）
    if (options.colors) {
      this.colors = options.colors;
    }

    // 游戏特定属性（兼容现有架构）
    this.padding = options.padding !== undefined ? options.padding : 20;
    this.topSafeArea = options.topSafeArea !== undefined ? options.topSafeArea : 60;
  }

  // 设置渲染上下文（兼容现有架构）- 也会设置所有子控件
  setContext(ctx) {
    this.ctx = ctx;
    this.canvas = ctx?.canvas;

    // 递归设置所有子控件的上下文
    this._attachToParent(this);
  }

  // 重写 _attachToParent，设置所有子控件的上下文
  _attachToParent(parent) {
    // 设置自身的上下文
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
    }
  }

  // 获取子控件
  getChild(name) {
    return this.children.find(child => child.name === name);
  }

  // 获取所有子控件
  getChildren() {
    return this.children;
  }

  // 清除所有子控件
  clearChildren() {
    this.children = [];
  }

  // 检测点是否在控件范围内（默认整个视口范围）
  contains(x, y) {
    return x >= 0 && x <= this.width && y >= 0 && y <= this.height;
  }

  // 渲染视口内容（子类重写）
  renderContent(ctx) {
    // 由子类实现
  }

  // 渲染（包含子控件）
  render(ctxOrData) {
    // 兼容两种渲染方式:
    // 1. render(ctx) - 纯UI引擎方式
    // 2. render(viewData) - 兼容现有架构，传入数据对象

    let ctx = this.ctx;

    // 如果传入的是数据对象（现有架构方式）
    if (ctxOrData && typeof ctxOrData === 'object' && !isCanvasRenderingContext(ctxOrData)) {
      // 这是 viewData，调用 renderContent 处理
      if (this.renderContent) {
        this.renderContent(ctxOrData);
      }
      // 同时渲染子控件（传入 viewData 供它们使用）
      for (const child of this.children) {
        if (child.render) {
          child.render(ctxOrData);
        }
      }
      return;
    }

    // 纯UI引擎方式
    ctx = ctxOrData || this.ctx;
    if (!ctx || !this.visible) return;

    ctx.save();

    // 应用滚动偏移
    if (this.scrollOffset.x !== 0 || this.scrollOffset.y !== 0) {
      ctx.translate(-this.scrollOffset.x, -this.scrollOffset.y);
    }

    // 渲染自定义内容
    this.renderContent(ctx);

    // 渲染所有子控件
    for (const child of this.children) {
      if (child.render) {
        child.render(ctx);
      }
    }

    ctx.restore();
  }

  // 更新所有子控件
  update(dt) {
    for (const child of this.children) {
      if (child.update) {
        child.update(dt);
      }
    }
  }

  // 处理点击事件（支持事件冒泡）
  handleClick(x, y) {
    if (!this.enabled || !this.visible) return null;

    // 考虑滚动偏移
    const adjustedX = x + this.scrollOffset.x;
    const adjustedY = y + this.scrollOffset.y;

    // 从后往前遍历（优先处理上层控件）
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child.contains && child.contains(adjustedX, adjustedY)) {
        if (child.handleClick) {
          const result = child.handleClick(adjustedX, adjustedY);
          if (result) {
            return result;
          }
        }
      }
    }

    return null;
  }

  // 处理滚动
  handleScroll(deltaY) {
    // 由子类实现
  }

  // 调整尺寸
  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  // 启用/禁用视口
  setEnabled(enabled) {
    this.enabled = enabled;
    for (const child of this.children) {
      if (child.setEnabled) {
        child.setEnabled(enabled);
      }
    }
  }

  // 显示/隐藏视口
  setVisible(visible) {
    this.visible = visible;
    for (const child of this.children) {
      if (child.setVisible) {
        child.setVisible(visible);
      }
    }
  }
}

// 兼容旧名称
export { Viewport as Scene };
