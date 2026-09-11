import { Viewport, ProgressBar } from '../engine/index.js';
import { drawTextWithShadow } from '../rendering/text.js';
import { DEMO } from '../data/demo.js';

export class DemoView extends Viewport {
  constructor() {
    super({ name: 'demo' });
    this.top = 0;
    this.clicks = 0;
    this.progress = this.addChild(new ProgressBar({ height: 8, max: 10, progressColor: '#d8b474', trackColor: '#293947' }));
  }

  layout(width, height, safe) {
    this.width = width;
    this.height = height;
    this.top = safe.top + 36;
    this.left = safe.left + 24;
    this.progress.x = this.left;
    this.progress.y = this.top + 210;
    this.progress.width = Math.max(1, width - this.left - safe.right - 24);
  }

  renderContent(ctx) {
    const text = (value, y, size, color) => {
      ctx.save();
      ctx.font = `${size}px sans-serif`;
      ctx.fillStyle = color;
      ctx.textBaseline = 'alphabetic';
      drawTextWithShadow(ctx, value, this.left, y, { inheritContext: true });
      ctx.restore();
    };
    text(DEMO.title, this.top + 28, 28, '#f3ead8');
    text(DEMO.subtitle, this.top + 66, 16, '#d8b474');
    text(DEMO.description, this.top + 100, 12, '#a4b4c3');
    text(DEMO.count(this.clicks), this.top + 188, 16, '#f3ead8');
    text(DEMO.footer, this.top + 260, 11, '#a4b4c3');
    this.progress.setValue(this.clicks % 11);
  }
}
