// UI Engine - 文本组件

import { BaseComponent } from './base.js';

export class TextBlock extends BaseComponent {
  constructor(options = {}) {
    super(options);

    this.text = options.text || '';
    this.color = options.color || '#ffffff';
    this.font = options.font || '14px PingFang SC, Microsoft YaHei, sans-serif';
    this.textAlign = options.textAlign || 'left';
    this.verticalAlign = options.verticalAlign || 'top';
    this.lineHeight = options.lineHeight || 1.5;
    this.maxWidth = options.maxWidth || 0;
    this.wordWrap = options.wordWrap !== false;
    this.overflow = options.overflow || 'visible';

    // 测量文本尺寸
    this._measuredWidth = 0;
    this._measuredHeight = 0;
  }

  // 渲染
  render(ctx) {
    if (!this.visible || !this.text) return;

    ctx.save();

    // 文本阴影效果
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle = this.color;
    ctx.font = this.font;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = 'top';

    // 计算文本位置
    let drawX = this.x + this.padding;
    let drawY = this.y + this.padding;

    // 水平对齐
    if (this.textAlign === 'center') {
      drawX = this.x + this.width / 2;
    } else if (this.textAlign === 'right') {
      drawX = this.x + this.width - this.padding;
    }

    // 垂直对齐
    if (this.verticalAlign === 'middle') {
      drawY = this.y + this.height / 2;
    } else if (this.verticalAlign === 'bottom') {
      drawY = this.y + this.height - this.padding;
    }

    // 渲染文本
    if (this.wordWrap && this.maxWidth > 0) {
      this._renderWrappedText(ctx, drawX, drawY);
    } else {
      ctx.fillText(this.text, drawX, drawY);
    }

    ctx.restore();
  }

  // 渲染自动换行文本
  _renderWrappedText(ctx, x, y) {
    const lines = this._wrapText(ctx, this.text, this.maxWidth - this.padding * 2);
    const lineHeight = this._getFontSize() * this.lineHeight;

    lines.forEach((line, index) => {
      ctx.fillText(line, x, y + index * lineHeight);
    });
  }

  // 文本换行处理
  _wrapText(ctx, text, maxWidth) {
    const words = text.split('');
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i];
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  // 获取字体大小
  _getFontSize() {
    const match = this.font.match(/(\d+)px/);
    return match ? parseInt(match[1]) : 14;
  }

  // 设置文本
  setText(text) {
    this.text = text;
  }

  // 设置颜色
  setColor(color) {
    this.color = color;
  }

  // 设置字体
  setFont(font) {
    this.font = font;
  }

  // 测量文本尺寸
  measureText(ctx) {
    ctx.font = this.font;
    const metrics = ctx.measureText(this.text);
    this._measuredWidth = metrics.width;
    this._measuredHeight = this._getFontSize();

    if (this.wordWrap && this.maxWidth > 0) {
      const lines = this._wrapText(ctx, this.text, this.maxWidth);
      this._measuredHeight = lines.length * this._getFontSize() * this.lineHeight;
    }

    return {
      width: this._measuredWidth,
      height: this._measuredHeight
    };
  }

  // 获取测量宽度
  getMeasuredWidth() {
    return this._measuredWidth;
  }

  // 获取测量高度
  getMeasuredHeight() {
    return this._measuredHeight;
  }
}

// ===== 工厂函数 =====

// 创建标签 TextBlock
export function createLabel(options = {}) {
  return new TextBlock({
    color: options.color || '#ffffff',
    font: options.font || '14px PingFang SC, Microsoft YaHei, sans-serif',
    textAlign: options.textAlign || 'left',
    verticalAlign: options.verticalAlign || 'top',
    text: options.text || ''
  });
}

// 创建属性行 TextBlock
export function createAttrLine(attrName, value, color = '#ffffff') {
  return new TextBlock({
    color: color,
    font: '13px PingFang SC, Microsoft YaHei, sans-serif',
    textAlign: 'left',
    text: `${attrName}: ${value}`
  });
}

// 创建分段标题 TextBlock
export function createSectionTitle(title) {
  return new TextBlock({
    color: '#ffffff',
    font: 'bold 13px PingFang SC, Microsoft YaHei, sans-serif',
    textAlign: 'left',
    text: title
  });
}

// 创建品质文字 TextBlock
export function createQualityText(quality, qualityNames = {}) {
  const colors = {
    novice: '#BFBFBF',
    refined: '#5FB344',
    epic: '#3B9DFE',
    legendary: '#A855F7',
    divine: '#F59E0B'
  };
  return new TextBlock({
    color: colors[quality] || '#ffffff',
    font: '13px PingFang SC, Microsoft YaHei, sans-serif',
    textAlign: 'left',
    text: qualityNames[quality] || quality || ''
  });
}

// 创建已装备标签 TextBlock
export function createEquippedTag() {
  return new TextBlock({
    color: '#5fb344',
    font: '11px PingFang SC, Microsoft YaHei, sans-serif',
    textAlign: 'left',
    text: '[已装备]'
  });
}
