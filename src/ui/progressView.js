import { Viewport, Button } from '../engine/index.js';
import { drawTextWithShadow } from '../rendering/text.js';
import { UI_ACTIONS } from '../core/actionTypes.js';
import { DEMO } from '../data/demo.js';

export class ProgressView extends Viewport {
  constructor() {
    super({ name: 'progress' });
    this.clicks = 0;
    this.openButton = this.addChild(new Button({
      text: DEMO.openConfirm, action: UI_ACTIONS.OPEN_MODAL,
      actionData: { name: 'upgrade' }, height: 48, normalColor: '#806137'
    }));
  }

  setData(data) { this.clicks = data?.clicks ?? 0; }

  layout(width, height, safe) {
    this.resize(width, height);
    this.left = safe.left + 24;
    this.top = safe.top + 64;
    this.openButton.x = this.left;
    this.openButton.y = height - safe.bottom - 100;
    this.openButton.width = Math.max(1, width - this.left - safe.right - 24);
  }

  renderContent(ctx) {
    const lines = [[DEMO.progressTitle, 26, '#f3ead8'], [DEMO.progressDescription, 14, '#a4b4c3'], [DEMO.count(this.clicks), 18, '#d8b474']];
    lines.forEach(([text, size, color], index) => drawTextWithShadow(ctx, text, this.left, this.top + index * 54, { font: `${size}px sans-serif`, color }));
  }
}
