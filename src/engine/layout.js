// UI Engine - 布局容器组件

import { BaseComponent, isCanvasRenderingContext } from './base.js';

// 水平布局容器
export class HBox extends BaseComponent {
  constructor(options = {}) {
    super(options);

    this.gap = options.gap || 10;
    this.align = options.align || 'top'; // top | middle | bottom
    this.justify = options.justify || 'start'; // start | center | end | space-between | space-around
  }

  // 渲染
  render(ctxOrData) {
    // 兼容两种调用方式
    if (ctxOrData && typeof ctxOrData === 'object' && !isCanvasRenderingContext(ctxOrData)) {
      return;
    }

    const ctx = ctxOrData || this.ctx;
    if (!this.visible || !ctx) return;

    // 计算子控件位置
    this._layoutChildren();

    // 渲染子控件
    ctx.save();
    ctx.translate(this.x, this.y);

    for (const child of this.children) {
      child.render(ctx);
    }

    ctx.restore();
  }

  // 布局子控件
  _layoutChildren() {
    if (this.children.length === 0) return;

    const totalWidth = this.children.reduce((sum, child) => sum + child.width, 0);
    const totalGap = this.gap * (this.children.length - 1);
    const availableWidth = this.width - totalWidth - totalGap;

    let startX = 0;

    // 水平分布
    if (this.justify === 'center') {
      startX = availableWidth / 2;
    } else if (this.justify === 'end') {
      startX = availableWidth;
    } else if (this.justify === 'space-between') {
      startX = 0;
    } else if (this.justify === 'space-around') {
      startX = availableWidth / 2;
    }

    let currentX = startX;

    for (const child of this.children) {
      let childY = 0;

      // 垂直对齐
      if (this.align === 'middle') {
        childY = (this.height - child.height) / 2;
      } else if (this.align === 'bottom') {
        childY = this.height - child.height;
      }

      child.setPosition(currentX, childY);

      // 计算下一个子控件的位置
      let offset = child.width + this.gap;
      if (this.justify === 'space-between') {
        offset = (availableWidth / (this.children.length - 1)) + child.width;
      } else if (this.justify === 'space-around') {
        offset = (availableWidth / this.children.length) + child.width;
      }

      currentX += offset;
    }
  }

  // 添加子控件
  addChild(child) {
    super.addChild(child);
    this._layoutChildren();
  }

  // 移除子控件
  removeChild(child) {
    super.removeChild(child);
    this._layoutChildren();
  }
}

// 垂直布局容器
export class VBox extends BaseComponent {
  constructor(options = {}) {
    super(options);

    this.gap = options.gap || 10;
    this.align = options.align || 'left'; // left | center | right
    this.justify = options.justify || 'start'; // start | center | end | space-between | space-around
  }

  // 渲染
  render(ctxOrData) {
    // 兼容两种调用方式
    if (ctxOrData && typeof ctxOrData === 'object' && !isCanvasRenderingContext(ctxOrData)) {
      return;
    }

    const ctx = ctxOrData || this.ctx;
    if (!this.visible || !ctx) return;

    // 计算子控件位置
    this._layoutChildren();

    // 渲染子控件
    ctx.save();
    ctx.translate(this.x, this.y);

    for (const child of this.children) {
      child.render(ctx);
    }

    ctx.restore();
  }

  // 布局子控件
  _layoutChildren() {
    if (this.children.length === 0) return;

    const totalHeight = this.children.reduce((sum, child) => sum + child.height, 0);
    const totalGap = this.gap * (this.children.length - 1);
    const availableHeight = this.height - totalHeight - totalGap;

    let startY = 0;

    // 垂直分布
    if (this.justify === 'center') {
      startY = availableHeight / 2;
    } else if (this.justify === 'end') {
      startY = availableHeight;
    } else if (this.justify === 'space-between') {
      startY = 0;
    } else if (this.justify === 'space-around') {
      startY = availableHeight / 2;
    }

    let currentY = startY;

    for (const child of this.children) {
      let childX = 0;

      // 水平对齐
      if (this.align === 'center') {
        childX = (this.width - child.width) / 2;
      } else if (this.align === 'right') {
        childX = this.width - child.width;
      }

      child.setPosition(childX, currentY);

      // 计算下一个子控件的位置
      let offset = child.height + this.gap;
      if (this.justify === 'space-between') {
        offset = (availableHeight / (this.children.length - 1)) + child.height;
      } else if (this.justify === 'space-around') {
        offset = (availableHeight / this.children.length) + child.height;
      }

      currentY += offset;
    }
  }

  // 添加子控件
  addChild(child) {
    super.addChild(child);
    this._layoutChildren();
  }

  // 移除子控件
  removeChild(child) {
    super.removeChild(child);
    this._layoutChildren();
  }
}

// 绝对定位容器
export class Container extends BaseComponent {
  constructor(options = {}) {
    super(options);
  }

  // 渲染
  render(ctxOrData) {
    // 兼容两种调用方式
    if (ctxOrData && typeof ctxOrData === 'object' && !isCanvasRenderingContext(ctxOrData)) {
      return;
    }

    const ctx = ctxOrData || this.ctx;
    if (!this.visible || !ctx) return;

    // 渲染背景
    this.renderBackground(ctx);
    this.renderBorder(ctx);

    // 渲染子控件
    ctx.save();
    ctx.translate(this.x, this.y);

    for (const child of this.children) {
      child.render(ctx);
    }

    ctx.restore();
  }

  // 更新
  update(dt) {
    for (const child of this.children) {
      if (child.update) {
        child.update(dt);
      }
    }
  }

  // 处理点击
  handleClick(x, y) {
    if (!this.enabled || !this.visible) return null;

    // 转换坐标到容器内部
    const localX = x - this.x;
    const localY = y - this.y;

    // 从后往前遍历（优先处理上层控件）
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child.contains && child.contains(localX, localY)) {
        if (child.handleClick) {
          return child.handleClick(localX, localY);
        }
      }
    }

    return null;
  }

  // 处理鼠标移动
  handleMouseMove(x, y) {
    if (!this.enabled || !this.visible) return false;

    const localX = x - this.x;
    const localY = y - this.y;

    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child.contains && child.contains(localX, localY)) {
        if (child.handleMouseMove) {
          return child.handleMouseMove(localX, localY);
        }
      }
    }

    return false;
  }

  // 处理鼠标按下
  handleMouseDown(x, y) {
    if (!this.enabled || !this.visible) return null;

    const localX = x - this.x;
    const localY = y - this.y;

    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child.contains && child.contains(localX, localY)) {
        if (child.handleMouseDown) {
          const result = child.handleMouseDown(localX, localY);
          if (result) return result;
        }
      }
    }

    return null;
  }

  // 处理鼠标释放
  handleMouseUp(x, y) {
    if (!this.enabled || !this.visible) return null;

    const localX = x - this.x;
    const localY = y - this.y;

    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child.contains && child.contains(localX, localY)) {
        if (child.handleMouseUp) {
          const result = child.handleMouseUp(localX, localY);
          if (result) return result;
        }
      }
    }

    return null;
  }
}
