// UI Engine - 按钮组件

import { BaseComponent } from './base.js';
import { drawTextWithShadow } from '../rendering/text.js';

const DEFAULT_FONT = '14px PingFang SC, Microsoft YaHei, sans-serif';
const DEFAULT_TEXT_COLOR = '#ffffff';
const DEFAULT_FILL_COLOR = '#c43a3a';
const DEFAULT_BORDER_COLOR = 'transparent';
const DEFAULT_STYLE = {
  fillStyle: DEFAULT_FILL_COLOR,
  strokeStyle: DEFAULT_BORDER_COLOR,
  lineWidth: 0,
  textColor: DEFAULT_TEXT_COLOR
};

function normalizeStyle(style = {}) {
  return {
    fillStyle: style.fillStyle ?? style.backgroundColor ?? null,
    strokeStyle: style.strokeStyle ?? style.borderColor ?? null,
    lineWidth: style.lineWidth ?? style.borderWidth ?? null,
    textColor: style.textColor ?? style.color ?? null
  };
}

function mergeStyles(baseStyle, overrideStyle) {
  const normalized = normalizeStyle(overrideStyle);
  return {
    fillStyle: normalized.fillStyle ?? baseStyle.fillStyle,
    strokeStyle: normalized.strokeStyle ?? baseStyle.strokeStyle,
    lineWidth: normalized.lineWidth ?? baseStyle.lineWidth,
    textColor: normalized.textColor ?? baseStyle.textColor
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseHexColor(color) {
  if (typeof color !== 'string' || !color.startsWith('#')) return null;
  const hex = color.slice(1);
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16)
    };
  }
  if (hex.length === 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }
  return null;
}

function toHexColor({ r, g, b }) {
  const toHex = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function shiftHexColor(color, amount = 0) {
  const parsed = parseHexColor(color);
  if (!parsed) return color;
  const shift = 255 * amount;
  return toHexColor({
    r: parsed.r + shift,
    g: parsed.g + shift,
    b: parsed.b + shift
  });
}

function getGhostFill(state) {
  if (state === 'disabled') return 'rgba(255,255,255,0.08)';
  if (state === 'pressed') return 'rgba(255,255,255,0.16)';
  if (state === 'hover') return 'rgba(255,255,255,0.12)';
  return 'rgba(255,255,255,0.06)';
}

export class Button extends BaseComponent {
  constructor(options = {}) {
    super(options);

    this.text = options.text || options.label || '';
    this.font = options.font || DEFAULT_FONT;
    this.icon = options.icon || null;
    this.iconSpacing = options.iconSpacing ?? 4;
    this.iconOnly = !!options.iconOnly;
    this.shape = options.shape || 'rect';
    this.variant = options.variant || 'solid';
    this.tone = options.tone || 'accent';
    this.state = options.state || 'normal';
    this.active = !!options.active;

    this.action = options.action || null;
    this.actionData = options.actionData || null;

    this.textColor = options.textColor || null;
    this.normalColor = options.normalColor || null;
    this.pressedColor = options.pressedColor || null;
    this.hoverColor = options.hoverColor || null;
    this.disabledColor = options.disabledColor || null;
    this.activeColor = options.activeColor || null;

    this.normalStyle = normalizeStyle(options.normalStyle);
    this.hoverStyle = normalizeStyle(options.hoverStyle);
    this.pressedStyle = normalizeStyle(options.pressedStyle);
    this.disabledStyle = normalizeStyle(options.disabledStyle);
    this.activeStyle = normalizeStyle(options.activeStyle);

    this._isPressed = false;
    this._isHovered = false;

    if (this.shape === 'circle' && options.radius != null) {
      const diameter = options.radius * 2;
      this.width = options.width || diameter;
      this.height = options.height || diameter;
    }

    if (this.state === 'disabled') {
      this.enabled = false;
    }
  }

  _getTonePalette() {
    const colors = this.colors || {};
    const accent = colors.accent || DEFAULT_FILL_COLOR;
    const toneMap = {
      accent: {
        fill: accent,
        stroke: colors.border || 'rgba(205, 176, 137, 0.35)',
        text: colors.text || DEFAULT_TEXT_COLOR
      },
      primary: {
        fill: accent,
        stroke: colors.border || 'rgba(205, 176, 137, 0.35)',
        text: colors.text || DEFAULT_TEXT_COLOR
      },
      secondary: {
        fill: colors.bgLight || 'rgba(255,255,255,0.10)',
        stroke: colors.border || 'rgba(205, 176, 137, 0.30)',
        text: colors.text || DEFAULT_TEXT_COLOR
      },
      danger: {
        fill: colors.attack || accent,
        stroke: colors.border || 'rgba(205, 176, 137, 0.35)',
        text: colors.text || DEFAULT_TEXT_COLOR
      },
      success: {
        fill: colors.green || '#5fb344',
        stroke: colors.border || 'rgba(205, 176, 137, 0.35)',
        text: colors.text || DEFAULT_TEXT_COLOR
      },
      info: {
        fill: colors.defense || '#3b9dfe',
        stroke: colors.border || 'rgba(205, 176, 137, 0.35)',
        text: colors.text || DEFAULT_TEXT_COLOR
      },
      gold: {
        fill: colors.gold || '#cdb089',
        stroke: colors.border || 'rgba(205, 176, 137, 0.35)',
        text: '#1a1a1a'
      },
      ghost: {
        fill: 'transparent',
        stroke: colors.border || 'rgba(205, 176, 137, 0.35)',
        text: colors.text || DEFAULT_TEXT_COLOR
      }
    };

    return toneMap[this.tone] || toneMap.accent;
  }

  _buildVariantStyle(state) {
    const palette = this._getTonePalette();
    const baseFill = palette.fill || DEFAULT_FILL_COLOR;

    if (this.variant === 'ghost') {
      return {
        fillStyle: getGhostFill(state),
        strokeStyle: palette.stroke,
        lineWidth: 1,
        textColor: palette.text
      };
    }

    if (this.variant === 'outline') {
      return {
        fillStyle: state === 'pressed'
          ? 'rgba(255,255,255,0.14)'
          : (state === 'hover' ? 'rgba(255,255,255,0.08)' : 'transparent'),
        strokeStyle: state === 'disabled' ? 'rgba(255,255,255,0.12)' : palette.stroke,
        lineWidth: 1,
        textColor: state === 'disabled' ? (this.colors?.textSecondary || '#888888') : palette.text
      };
    }

    const disabledFill = this.disabledColor || 'rgba(255,255,255,0.10)';
    const activeFill = this.activeColor || shiftHexColor(baseFill, 0.06);
    const hoverFill = this.hoverColor || shiftHexColor(baseFill, 0.08);
    const pressedFill = this.pressedColor || shiftHexColor(baseFill, -0.08);

    if (state === 'disabled') {
      return {
        fillStyle: disabledFill,
        strokeStyle: 'transparent',
        lineWidth: 0,
        textColor: this.colors?.textSecondary || '#888888'
      };
    }

    if (state === 'pressed') {
      return {
        fillStyle: pressedFill,
        strokeStyle: palette.stroke,
        lineWidth: 0,
        textColor: palette.text
      };
    }

    if (state === 'hover') {
      return {
        fillStyle: hoverFill,
        strokeStyle: palette.stroke,
        lineWidth: 0,
        textColor: palette.text
      };
    }

    if (state === 'active') {
      return {
        fillStyle: activeFill,
        strokeStyle: palette.stroke,
        lineWidth: 0,
        textColor: palette.text
      };
    }

    return {
      fillStyle: this.normalColor || baseFill,
      strokeStyle: palette.stroke,
      lineWidth: 0,
      textColor: this.textColor || palette.text
    };
  }

  _getStateName() {
    if (!this.enabled || this.state === 'disabled') return 'disabled';
    if (this._isPressed) return 'pressed';
    if (this._isHovered) return 'hover';
    if (this.active) return 'active';
    return 'normal';
  }

  _getResolvedStyle() {
    const state = this._getStateName();
    const baseStyle = mergeStyles(DEFAULT_STYLE, this._buildVariantStyle(state));
    const explicitNormalStyle = mergeStyles(baseStyle, {
      fillStyle: this.normalColor,
      textColor: this.textColor
    });

    if (state === 'normal') {
      return mergeStyles(explicitNormalStyle, this.normalStyle);
    }
    if (state === 'hover') {
      return mergeStyles(explicitNormalStyle, this.hoverStyle);
    }
    if (state === 'pressed') {
      return mergeStyles(explicitNormalStyle, this.pressedStyle);
    }
    if (state === 'active') {
      return mergeStyles(explicitNormalStyle, this.activeStyle);
    }
    return mergeStyles(explicitNormalStyle, this.disabledStyle);
  }

  getAction() {
    if (!this.enabled || !this.action) return null;
    return {
      type: this.action,
      ...(this.actionData || {})
    };
  }

  setAction(action, data = {}) {
    this.action = action;
    this.actionData = data;
  }

  setText(text) {
    this.text = text;
  }

  setLabel(text) {
    this.text = text;
  }

  setIcon(icon) {
    this.icon = icon;
  }

  setNormalColor(color) {
    this.normalColor = color;
  }

  setPressedColor(color) {
    this.pressedColor = color;
  }

  setHoverColor(color) {
    this.hoverColor = color;
  }

  setDisabledColor(color) {
    this.disabledColor = color;
  }

  setActiveColor(color) {
    this.activeColor = color;
  }

  setTextColor(color) {
    this.textColor = color;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.state = enabled ? 'normal' : 'disabled';
  }

  setState(state) {
    this.state = state;
    this.enabled = state !== 'disabled';
  }

  setActive(active) {
    this.active = !!active;
  }

  setHovered(hovered) {
    this._isHovered = !!hovered;
  }

  setPressed(pressed) {
    this._isPressed = !!pressed;
  }

  setVariant(variant) {
    this.variant = variant;
  }

  setTone(tone) {
    this.tone = tone;
  }

  setShape(shape) {
    this.shape = shape;
  }

  setStyle(style = {}) {
    if (style.normalStyle) this.normalStyle = normalizeStyle(style.normalStyle);
    if (style.hoverStyle) this.hoverStyle = normalizeStyle(style.hoverStyle);
    if (style.pressedStyle) this.pressedStyle = normalizeStyle(style.pressedStyle);
    if (style.disabledStyle) this.disabledStyle = normalizeStyle(style.disabledStyle);
    if (style.activeStyle) this.activeStyle = normalizeStyle(style.activeStyle);
  }

  contains(x, y) {
    if (!this.visible) return false;

    if (this.shape === 'circle') {
      const radius = Math.min(this.width, this.height) / 2;
      const centerX = this.x + this.width / 2;
      const centerY = this.y + this.height / 2;
      const dx = x - centerX;
      const dy = y - centerY;
      return dx * dx + dy * dy <= radius * radius;
    }

    return super.contains(x, y);
  }

  _drawShape(ctx) {
    if (this.shape === 'circle') {
      const radius = Math.min(this.width, this.height) / 2;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, radius, 0, Math.PI * 2);
      ctx.closePath();
      return;
    }

    this.drawRoundedRect(ctx, this.x, this.y, this.width, this.height, this.borderRadius || 6);
  }

  render(ctx) {
    if (!this.visible) return;

    const targetCtx = ctx || this.ctx;
    if (!targetCtx) return;

    const style = this._getResolvedStyle();

    targetCtx.save();

    if (style.fillStyle && style.fillStyle !== 'transparent') {
      targetCtx.fillStyle = style.fillStyle;
      this._drawShape(targetCtx);
      targetCtx.fill();
    } else {
      this._drawShape(targetCtx);
    }

    if (style.lineWidth > 0 && style.strokeStyle && style.strokeStyle !== 'transparent') {
      targetCtx.strokeStyle = style.strokeStyle;
      targetCtx.lineWidth = style.lineWidth;
      this._drawShape(targetCtx);
      targetCtx.stroke();
    }

    if (this.text || this.icon) {
      targetCtx.fillStyle = style.textColor || DEFAULT_TEXT_COLOR;
      targetCtx.font = this.font;
      targetCtx.textAlign = 'center';
      targetCtx.textBaseline = 'middle';
      const content = this.iconOnly
        ? (this.icon || this.text)
        : (this.icon ? `${this.icon}${this.text ? ' '.repeat(Math.max(1, Math.floor(this.iconSpacing / 4))) : ''}${this.text}` : this.text);
      drawTextWithShadow(
        targetCtx,
        content,
        this.x + this.width / 2,
        this.y + this.height / 2,
        { inheritContext: true }
      );
    }

    targetCtx.restore();
  }

  handleMouseDown(x, y) {
    if (!this.enabled || !this.contains(x, y)) return false;
    this._isPressed = true;
    return true;
  }

  handleMouseUp(x, y) {
    if (!this.enabled) return false;

    const wasPressed = this._isPressed;
    this._isPressed = false;

    if (wasPressed && this.contains(x, y)) {
      const action = this.getAction();
      this.dispatchEvent('click', { x, y, button: this, action });
      return action || true;
    }
    return false;
  }

  handleMouseMove(x, y) {
    if (!this.enabled) return false;

    const wasHovered = this._isHovered;
    this._isHovered = this.contains(x, y);

    if (this._isHovered && !wasHovered) {
      this.dispatchEvent('mouseenter', { x, y });
    } else if (!this._isHovered && wasHovered) {
      this.dispatchEvent('mouseleave', { x, y });
    }

    return this._isHovered;
  }

  handleClick(x, y) {
    if (!this.enabled || !this.contains(x, y)) return null;

    const action = this.getAction();
    if (action) {
      this.dispatchEvent('click', { x, y, button: this, action });
      return action;
    }

    const result = { action: 'click', data: { button: this } };
    this.dispatchEvent('click', { x, y, button: this, action: result });
    return result;
  }
}
