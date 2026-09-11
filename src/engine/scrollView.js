// UI Engine - 滚动视图组件

import { BaseComponent } from './base.js';
import { getPlatform } from '../platform/index.js';

export class ScrollView extends BaseComponent {
  constructor(options = {}) {
    super(options);

    this.content = options.content || null;

    // 滚动位置
    this.scrollX = 0;
    this.scrollY = 0;
    this.maxScrollX = 0;
    this.maxScrollY = 0;

    // 滚动条
    this.showScrollBar = options.showScrollBar !== false;
    this.scrollBarWidth = options.scrollBarWidth || 8;
    this.scrollBarColor = options.scrollBarColor || 'rgba(255, 255, 255, 0.3)';
    this.scrollBarBgColor = options.scrollBarBgColor || 'rgba(255, 255, 255, 0.1)';

    // 内部状态
    this._isDragging = false;
    this._lastX = 0;
    this._lastY = 0;
  }

  // 渲染
  render(ctx) {
    if (!this.visible) return;

    ctx.save();

    // 裁剪内容区域
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.width, this.height);
    ctx.clip();

    // 移动到滚动位置
    ctx.translate(this.x - this.scrollX, this.y - this.scrollY);

    // 渲染内容
    if (this.content) {
      this.content.render(ctx);
    }

    ctx.restore();

    // 渲染滚动条
    if (this.showScrollBar) {
      this._renderScrollBars(ctx);
    }
  }

  // 渲染滚动条
  _renderScrollBars(ctx) {
    // 垂直滚动条
    if (this.maxScrollY > 0) {
      const barHeight = this.height * (this.height / (this.maxScrollY + this.height));
      const barY = this.y + (this.scrollY / this.maxScrollY) * (this.height - barHeight);

      // 背景
      ctx.fillStyle = this.scrollBarBgColor;
      ctx.fillRect(this.x + this.width - this.scrollBarWidth - 2, this.y, this.scrollBarWidth, this.height);

      // 滚动条
      ctx.fillStyle = this.scrollBarColor;
      ctx.fillRect(this.x + this.width - this.scrollBarWidth - 2, barY, this.scrollBarWidth, barHeight);
    }

    // 水平滚动条
    if (this.maxScrollX > 0) {
      const barWidth = this.width * (this.width / (this.maxScrollX + this.width));
      const barX = this.x + (this.scrollX / this.maxScrollX) * (this.width - barWidth);

      // 背景
      ctx.fillStyle = this.scrollBarBgColor;
      ctx.fillRect(this.x, this.y + this.height - this.scrollBarWidth - 2, this.width, this.scrollBarWidth);

      // 滚动条
      ctx.fillStyle = this.scrollBarColor;
      ctx.fillRect(barX, this.y + this.height - this.scrollBarWidth - 2, barWidth, this.scrollBarWidth);
    }
  }

  // 设置内容
  setContent(content) {
    this.content = content;
    this._updateMaxScroll();
  }

  // 滚动到指定位置
  scrollTo(x, y) {
    this.scrollX = Math.max(0, Math.min(x, this.maxScrollX));
    this.scrollY = Math.max(0, Math.min(y, this.maxScrollY));

    this.dispatchEvent('scroll', {
      scrollX: this.scrollX,
      scrollY: this.scrollY
    });
  }

  // 滚动指定增量
  scrollBy(deltaX, deltaY) {
    this.scrollTo(this.scrollX + deltaX, this.scrollY + deltaY);
  }

  // 更新最大滚动值
  _updateMaxScroll() {
    if (!this.content) {
      this.maxScrollX = 0;
      this.maxScrollY = 0;
      return;
    }

    this.maxScrollX = Math.max(0, this.content.width - this.width);
    this.maxScrollY = Math.max(0, this.content.height - this.height);

    // 确保滚动位置在有效范围内
    this.scrollX = Math.min(this.scrollX, this.maxScrollX);
    this.scrollY = Math.min(this.scrollY, this.maxScrollY);
  }

  // 处理鼠标按下
  handleMouseDown(x, y) {
    if (!this.enabled || !this.contains(x, y)) return false;

    // 检测滚动条区域
    if (x >= this.x + this.width - this.scrollBarWidth - 5) {
      this._isDragging = true;
      this._lastY = y;
      return true;
    }

    // Press feedback must not execute the content's click action.
    if (this.content && this.content.handleMouseDown) {
      const contentX = x + this.scrollX - this.x;
      const contentY = y + this.scrollY - this.y;
      return this.content.handleMouseDown(contentX, contentY);
    }

    return false;
  }

  handleClick(x, y) {
    if (!this.enabled || !this.contains(x, y)) return null;
    return this.content?.handleClick?.(x + this.scrollX - this.x, y + this.scrollY - this.y) || null;
  }

  // 处理鼠标拖拽
  handleDrag(x, y, deltaX, deltaY) {
    if (!this.enabled) return;

    if (this._isDragging) {
      // 滚动条拖拽
      // 这里简化处理，实际需要根据滚动条位置计算
    } else {
      // 内容拖拽
      this.scrollBy(-deltaX, -deltaY);
    }
  }

  // 处理鼠标释放
  handleMouseUp(x, y) {
    this._isDragging = false;
  }

  // 处理鼠标移动
  handleMouseMove(x, y) {
    if (!this.enabled) return false;

    // 检测是否在滚动条区域
    if (x >= this.x + this.width - this.scrollBarWidth - 5) {
      getPlatform().setCursor?.('pointer');
      return true;
    }

    getPlatform().setCursor?.('default');
    return false;
  }

  // 更新
  update(dt) {
    if (this.content && this.content.update) {
      this.content.update(dt);
    }
  }
}
