import { Container, Button } from '../engine/index.js';
import { drawTextWithShadow } from '../rendering/text.js';
import { UI_ACTIONS } from '../core/actionTypes.js';
import { GAME_ACTIONS } from '../game/actionTypes.js';
import { DEMO } from '../data/demo.js';

// The manager supplies the full-screen mask; this component owns only panel coordinates.
export class ConfirmModal extends Container {
  constructor() {
    super({ width: 320, height: 224, backgroundColor: '#1c3040', borderRadius: 16 });
    this.cancelButton = this.addChild(new Button({ text: DEMO.cancel, action: UI_ACTIONS.CLOSE_MODAL, actionData: { name: 'upgrade' }, height: 44, normalColor: '#284457' }));
    this.confirmButton = this.addChild(new Button({ text: DEMO.confirm, action: GAME_ACTIONS.CONFIRM_INCREMENT, height: 44, normalColor: '#806137' }));
  }

  layout(width, height, safe) {
    this.width = Math.max(1, Math.min(360, width - safe.left - safe.right - 32));
    this.x = safe.left + (width - safe.left - safe.right - this.width) / 2;
    this.y = safe.top + Math.max(0, (height - safe.top - safe.bottom - this.height) / 2);
    this.cancelButton.x = 20;
    this.confirmButton.x = this.width / 2 + 4;
    for (const button of [this.cancelButton, this.confirmButton]) {
      button.y = 156;
      button.width = Math.max(1, this.width / 2 - 24);
    }
  }

  render(ctx) {
    if (!this.visible) return;
    super.render(ctx);
    drawTextWithShadow(ctx, DEMO.confirmTitle, this.x + 20, this.y + 44, { font: '22px sans-serif', color: '#f3ead8' });
    drawTextWithShadow(ctx, DEMO.confirmDescription, this.x + 20, this.y + 92, { font: '13px sans-serif', color: '#a4b4c3' });
  }
}
