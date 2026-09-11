import { drawTextWithShadow } from '../rendering/text.js';

const NOTICE_MAX_WIDTH_RATIO = 0.9;
const NOTICE_STACK_GAP = 8;

function wrapNoticeText(ctx, text, maxWidth) {
  const content = text == null ? '' : String(text);
  if (!content) {
    return [''];
  }

  const safeMaxWidth = Math.max(0, maxWidth || 0);
  if (safeMaxWidth <= 0) {
    return [content];
  }

  const paragraphs = content.replace(/\r/g, '').split('\n');
  const lines = [];

  paragraphs.forEach((paragraph) => {
    if (!paragraph) {
      lines.push('');
      return;
    }

    let current = '';
    [...paragraph].forEach((char) => {
      const candidate = current + char;
      if (!current || ctx.measureText(candidate).width <= safeMaxWidth) {
        current = candidate;
        return;
      }

      lines.push(current);
      current = char;
    });

    if (current) {
      lines.push(current);
    }
  });

  return lines.length > 0 ? lines : [''];
}

class NoticeItem {
  constructor(text, options = {}) {
    this.text = text;
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.targetY = options.targetY || 0;
    this.opacity = 0;
    this.scale = 0.8;
    this.life = 0;
    this.maxLife = options.duration || 2000;
    this.fadeInDuration = options.fadeInDuration || 200;
    this.stayDuration = options.stayDuration || 1000;
    this.fadeOutDuration = options.fadeOutDuration || 500;
    this.color = options.color || '#ffffff';
    this.bgColor = options.bgColor || 'rgba(0, 0, 0, 0.7)';
    this.fontSize = options.fontSize || 16;
    this.padding = options.padding || { x: 20, y: 10 };
    this.screenWidth = options.screenWidth || 800;
    this.screenHeight = options.screenHeight || 600;
    this.state = 'fadeIn';
    this.onComplete = options.onComplete || null;
    this.layoutCache = null;
    this.layoutCacheKey = '';
  }

  update(dt) {
    this.life += dt;

    if (this.state === 'fadeIn') {
      const progress = Math.min(1, this.life / this.fadeInDuration);
      this.opacity = progress;
      this.scale = 0.8 + progress * 0.2;
      this.y = this.targetY + (1 - progress) * 20;

      if (progress >= 1) {
        this.state = 'stay';
        this.opacity = 1;
        this.scale = 1;
        this.y = this.targetY;
      }
    } else if (this.state === 'stay') {
      this.opacity = 1;
      this.y = this.targetY;

      if (this.life >= this.fadeInDuration + this.stayDuration) {
        this.state = 'fadeOut';
      }
    } else if (this.state === 'fadeOut') {
      const fadeOutProgress = (this.life - this.fadeInDuration - this.stayDuration) / this.fadeOutDuration;
      this.opacity = Math.max(0, 1 - fadeOutProgress);
      this.y -= dt * 0.05;

      if (fadeOutProgress >= 1) {
        this.opacity = 0;
        if (this.onComplete) {
          this.onComplete();
        }
        return false;
      }
    }

    return true;
  }

  getFont() {
    return `bold ${this.fontSize}px PingFang SC, Microsoft YaHei, sans-serif`;
  }

  measureLayout(ctx) {
    const paddingX = this.padding?.x ?? 20;
    const paddingY = this.padding?.y ?? 10;
    const screenWidth = Math.max(1, this.screenWidth || 800);
    const maxBoxWidth = Math.max(this.fontSize + paddingX * 2 + 4, screenWidth * NOTICE_MAX_WIDTH_RATIO);
    const maxTextWidth = Math.max(this.fontSize, maxBoxWidth - paddingX * 2);
    const font = this.getFont();
    const cacheKey = `${font}|${this.text}|${maxTextWidth}|${paddingX}|${paddingY}`;

    if (this.layoutCache && this.layoutCacheKey === cacheKey) {
      return this.layoutCache;
    }

    ctx.save();
    ctx.font = font;
    const lines = wrapNoticeText(ctx, this.text, maxTextWidth);
    const textWidth = lines.reduce((widest, line) => {
      return Math.max(widest, ctx.measureText(line).width);
    }, 0);
    ctx.restore();

    const lineHeight = Math.max(this.fontSize + 4, Math.round(this.fontSize * 1.35));
    const textHeight = Math.max(this.fontSize, lines.length * lineHeight);
    const layout = {
      font,
      lines,
      lineHeight,
      textHeight,
      boxWidth: Math.min(maxBoxWidth, Math.max(paddingX * 2, textWidth + paddingX * 2)),
      boxHeight: textHeight + paddingY * 2
    };

    this.layoutCache = layout;
    this.layoutCacheKey = cacheKey;
    return layout;
  }

  getBoxHeight(ctx) {
    return this.measureLayout(ctx).boxHeight;
  }

  render(ctx, offsetY = 0) {
    if (this.opacity <= 0) return;

    const layout = this.measureLayout(ctx);
    const renderY = this.y + offsetY;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    ctx.fillStyle = this.bgColor;
    this.drawRoundedRect(
      ctx,
      this.x - layout.boxWidth / 2,
      renderY - layout.boxHeight / 2,
      layout.boxWidth,
      layout.boxHeight,
      8
    );
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.5})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = this.color;
    ctx.font = layout.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const firstLineCenterY = renderY - layout.textHeight / 2 + layout.lineHeight / 2;
    layout.lines.forEach((line, index) => {
      drawTextWithShadow(ctx, line, this.x, firstLineCenterY + index * layout.lineHeight, {
        inheritContext: true
      });
    });

    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

export class NoticeManager {
  constructor() {
    this.notices = [];
    this.queue = [];
    this.maxConcurrent = 3;
    this.maxRetained = 3;
    this.queueDelay = 500;
    this.lastShowTime = 0;
    this.sequence = 0;
  }

  show(text, options = {}) {
    const entry = {
      text,
      options,
      sequence: ++this.sequence
    };

    if (options.x == null || options.y == null) {
      this.queue.push(entry);
      this._trimToRecent();
      this._processQueue();
      return;
    }

    this._createNotice(entry);
    this._trimToRecent();
  }

  _createNotice(entry, optionsOverride = null) {
    const notice = new NoticeItem(entry.text, optionsOverride || entry.options);
    notice.sequence = entry.sequence;
    this.notices.push(notice);
  }

  _findOldestItem() {
    let oldest = null;

    this.notices.forEach((notice, index) => {
      if (!oldest || notice.sequence < oldest.sequence) {
        oldest = { collection: this.notices, index, sequence: notice.sequence };
      }
    });

    this.queue.forEach((entry, index) => {
      if (!oldest || entry.sequence < oldest.sequence) {
        oldest = { collection: this.queue, index, sequence: entry.sequence };
      }
    });

    return oldest;
  }

  _trimToRecent() {
    while (this.notices.length + this.queue.length > this.maxRetained) {
      const oldest = this._findOldestItem();
      if (!oldest) break;
      oldest.collection.splice(oldest.index, 1);
    }
  }

  _processQueue() {
    const now = Date.now();

    if (this.queue.length === 0) return;
    if (this.notices.length >= this.maxConcurrent) return;
    if (now - this.lastShowTime < this.queueDelay) {
      setTimeout(() => this._processQueue(), this.queueDelay);
      return;
    }

    const entry = this.queue.shift();
    const { text, options } = entry;

    const screenWidth = options.screenWidth || 800;
    const screenHeight = options.screenHeight || 600;
    const centerX = screenWidth / 2;
    const baseY = screenHeight * 0.4;

    const noticeOptions = {
      ...options,
      x: centerX,
      y: baseY + 20,
      targetY: baseY,
      screenWidth,
      screenHeight,
      onComplete: () => {
        this._processQueue();
      }
    };

    const notice = new NoticeItem(text, noticeOptions);
    notice.sequence = entry.sequence;
    this.notices.unshift(notice);

    this.lastShowTime = now;

    if (this.queue.length > 0) {
      setTimeout(() => this._processQueue(), this.queueDelay);
    }
  }

  update(dt) {
    for (let i = this.notices.length - 1; i >= 0; i--) {
      const notice = this.notices[i];
      const alive = notice.update(dt);
      if (!alive) {
        this.notices.splice(i, 1);
      }
    }

    if (this.queue.length > 0 && this.notices.length < this.maxConcurrent) {
      this._processQueue();
    }
  }

  render(ctx, screenWidth, screenHeight) {
    let stackOffset = 0;

    this.notices.forEach((notice) => {
      if (notice.x == null) notice.x = screenWidth / 2;
      notice.screenWidth = screenWidth;
      notice.screenHeight = screenHeight;

      const offsetY = -stackOffset;
      notice.render(ctx, offsetY);
      stackOffset += notice.getBoxHeight(ctx) + NOTICE_STACK_GAP;
    });
  }

  clear() {
    this.notices = [];
    this.queue = [];
  }

  get count() {
    return this.notices.length + this.queue.length;
  }
}

let globalNoticeManager = null;

export function getGlobalNoticeManager() {
  if (!globalNoticeManager) {
    globalNoticeManager = new NoticeManager();
  }
  return globalNoticeManager;
}

export function setGlobalNoticeManager(manager) {
  globalNoticeManager = manager;
}

export function showNotice(text, options) {
  const manager = getGlobalNoticeManager();
  manager.show(text, options);
}
