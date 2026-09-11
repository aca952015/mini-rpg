// UI Engine - 进度条组件

import { BaseComponent } from './base.js';

export class ProgressBar extends BaseComponent {
  constructor(options = {}) {
    super(options);

    this.value = options.value || 0;
    this.min = options.min || 0;
    this.max = options.max || 100;
    this.direction = options.direction || 'horizontal';

    // 样式
    this.trackColor = options.trackColor || null;
    this.progressColor = options.progressColor || null;
    this.borderRadius = options.borderRadius || 4;
  }

  // 渲染
  render(ctx) {
    if (!this.visible) return;

    const colors = this.colors || {};
    ctx.save();

    // 轨道背景
    ctx.fillStyle = this.trackColor || colors.bgLight || '#16213e';
    this.drawRoundedRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius);
    ctx.fill();

    // 进度
    const percent = this.getPercent();
    const progressWidth = (this.width * percent) / 100;
    const progressHeight = (this.height * percent) / 100;

    ctx.fillStyle = this.progressColor || colors.accent || '#e94560';

    if (this.direction === 'horizontal') {
      this.drawRoundedRect(ctx, this.x, this.y, progressWidth, this.height, this.borderRadius);
      ctx.fill();
    } else {
      // 垂直进度条
      const progressY = this.y + this.height - progressHeight;
      this.drawRoundedRect(ctx, this.x, progressY, this.width, progressHeight, this.borderRadius);
      ctx.fill();
    }

    ctx.restore();
  }

  // 设置值
  setValue(value) {
    this.value = Math.max(this.min, Math.min(value, this.max));
  }

  // 设置百分比 (0-100)
  setProgress(percent) {
    this.value = (this.max - this.min) * (percent / 100) + this.min;
  }

  // 获取当前值
  getValue() {
    return this.value;
  }

  // 获取百分比
  getPercent() {
    if (this.max === this.min) return 0;
    return ((this.value - this.min) / (this.max - this.min)) * 100;
  }
}
