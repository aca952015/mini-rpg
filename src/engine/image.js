// UI Engine - 图片组件

import { BaseComponent } from './base.js';
import { drawTextWithShadow } from '../rendering/text.js';
import { getPlatform } from '../platform/index.js';

export class Image extends BaseComponent {
  constructor(options = {}) {
    super(options);

    this.src = options.src || '';
    this.image = null;
    this.loaded = false;
    this.loading = false;
    this.error = null;

    // 样式
    this.objectFit = options.objectFit || 'fill'; // fill, contain, cover
    this.placeholder = options.placeholder || null;

    // 异步加载图片
    if (this.src) {
      this._loadImage();
    }
  }

  // 加载图片
  _loadImage() {
    if (this.loading || this.loaded) return;

    this.loading = true;
    const image = getPlatform().createImage();
    this.image = image;
    image.onload = () => {
      this.loading = false;
      this.loaded = true;
    };
    image.onerror = (error) => {
      this.loading = false;
      this.loaded = false;
      this.error = error || new Error(`Failed to load image: ${this.src}`);
    };
    image.src = this.src;
  }

  // 设置图片源
  setSrc(src) {
    this.src = src;
    this.loaded = false;
    this.error = null;
    this._loadImage();
  }

  // 渲染
  render(ctx) {
    if (!this.visible) return;

    ctx.save();

    // 绘制占位符
    if (!this.loaded && !this.loading) {
      this._renderPlaceholder(ctx);
    }

    // 绘制加载中
    if (this.loading) {
      this._renderLoading(ctx);
    }

    // 绘制图片
    if (this.loaded && this.image) {
      this._renderImage(ctx);
    }

    ctx.restore();
  }

  // 渲染占位符
  _renderPlaceholder(ctx) {
    if (this.placeholder) {
      // 如果有占位符文本
      ctx.fillStyle = this.backgroundColor || '#333';
      ctx.fillRect(this.x, this.y, this.width, this.height);

      ctx.fillStyle = '#666';
      ctx.font = '12px PingFang SC, Microsoft YaHei, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      drawTextWithShadow(ctx, this.placeholder, this.x + this.width / 2, this.y + this.height / 2, { inheritContext: true });
    }
  }

  // 渲染加载中
  _renderLoading(ctx) {
    ctx.fillStyle = this.backgroundColor || '#333';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.fillStyle = '#888';
    ctx.font = '12px PingFang SC, Microsoft YaHei, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    drawTextWithShadow(ctx, '加载中...', this.x + this.width / 2, this.y + this.height / 2, { inheritContext: true });
  }

  // 渲染图片
  _renderImage(ctx) {
    let drawX = this.x;
    let drawY = this.y;
    let drawWidth = this.width;
    let drawHeight = this.height;

    if (this.objectFit === 'contain') {
      // 保持比例，包含在区域内
      const scale = Math.min(this.width / this.image.width, this.height / this.image.height);
      drawWidth = this.image.width * scale;
      drawHeight = this.image.height * scale;
      drawX = this.x + (this.width - drawWidth) / 2;
      drawY = this.y + (this.height - drawHeight) / 2;
    } else if (this.objectFit === 'cover') {
      // 保持比例，覆盖区域
      const scale = Math.max(this.width / this.image.width, this.height / this.image.height);
      drawWidth = this.image.width * scale;
      drawHeight = this.image.height * scale;
      drawX = this.x + (this.width - drawWidth) / 2;
      drawY = this.y + (this.height - drawHeight) / 2;
    }

    ctx.drawImage(this.image, drawX, drawY, drawWidth, drawHeight);
  }

  // 获取图片原始尺寸
  getNaturalSize() {
    if (this.loaded && this.image) {
      return { width: this.image.width, height: this.image.height };
    }
    return { width: 0, height: 0 };
  }
}

// 图标组件（使用文字或简单图形）
export class Icon extends BaseComponent {
  constructor(options = {}) {
    super(options);

    this.icon = options.icon || ''; // Emoji 或文字
    this.iconFont = options.iconFont || '20px Arial';
    this.color = options.color || '#ffffff';
  }

  // 渲染
  render(ctx) {
    if (!this.visible || !this.icon) return;

    ctx.save();

    ctx.fillStyle = this.color;
    ctx.font = this.iconFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 根据对齐方式计算位置
    let drawX = this.x + this.width / 2;
    let drawY = this.y + this.height / 2;

    drawTextWithShadow(ctx, this.icon, drawX, drawY, { inheritContext: true });

    ctx.restore();
  }

  // 设置图标
  setIcon(icon) {
    this.icon = icon;
  }
}
