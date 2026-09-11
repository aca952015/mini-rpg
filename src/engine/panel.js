// UI Engine - 面板和模态框组件

import { BaseComponent } from './base.js';
import { TextBlock } from './textBlock.js';
import { Button } from './button.js';
import { drawTextWithShadow } from '../rendering/text.js';

export class Panel extends BaseComponent {
  constructor(options = {}) {
    super(options);

    // 样式
    this.title = options.title || '';
    this.showTitleBar = options.showTitleBar !== false;
    this.titleHeight = options.titleHeight || 40;
    this.titleColor = options.titleColor || null;
    this.titleBgColor = options.titleBgColor || null;
    this.closeable = options.closeable !== false;
    this.draggable = options.draggable || false;

    // 内部组件
    this.titleText = null;
    this.closeButton = null;

    if (this.showTitleBar && this.title) {
      const colors = this.colors || {};
      this.titleText = new TextBlock({
        text: this.title,
        color: this.titleColor || colors.text || '#ffffff',
        font: 'bold 14px PingFang SC, Microsoft YaHei, sans-serif',
        textAlign: 'center',
        verticalAlign: 'middle'
      });

      if (this.closeable) {
        this.closeButton = new Button({
          text: '×',
          width: 30,
          height: 30,
          font: '20px Arial',
          normalColor: 'transparent',
          textColor: '#8892b0'
        });
        this.closeButton.on('click', () => {
          this.dispatchEvent('close');
        });
        this.addChild(this.closeButton);
      }
    }
  }

  // 设置是否可见
  setVisible(visible) {
    this.visible = visible;
  }

  // 设置背景颜色
  setBackgroundColor(color) {
    this.maskColor = color;
  }

  // 渲染
  render(ctx) {
    if (!this.visible) return;

    ctx.save();

    // 绘制背景
    this.renderBackground(ctx);

    // 绘制边框
    this.renderBorder(ctx);

    // 绘制标题栏
    if (this.showTitleBar) {
      this._renderTitleBar(ctx);
    }

    // 裁剪内容区域
    ctx.beginPath();
    const contentY = this.showTitleBar ? this.y + this.titleHeight : this.y;
    ctx.rect(this.x, contentY, this.width, this.height - (this.showTitleBar ? this.titleHeight : 0));
    ctx.clip();

    // 渲染子控件
    this.renderChildren(ctx);

    ctx.restore();
  }

  // 渲染标题栏
  _renderTitleBar(ctx) {
    // 标题栏背景
    const colors = this.colors || {};
    ctx.fillStyle = this.titleBgColor || colors.bgLight || '#16213e';
    ctx.fillRect(this.x, this.y, this.width, this.titleHeight);

    // 标题栏底部边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.titleHeight);
    ctx.lineTo(this.x + this.width, this.y + this.titleHeight);
    ctx.stroke();

    // 渲染标题文字
    if (this.titleText) {
      this.titleText.setPosition(this.x, this.y);
      this.titleText.setSize(this.width, this.titleHeight);
      this.titleText.render(ctx);
    }

    // 渲染关闭按钮
    if (this.closeButton) {
      this.closeButton.setPosition(this.x + this.width - 35, this.y + 5);
      this.closeButton.render(ctx);
    }
  }

  // 渲染子控件
  renderChildren(ctx) {
    const contentY = this.showTitleBar ? this.y + this.titleHeight : this.y;
    const contentHeight = this.height - (this.showTitleBar ? this.titleHeight : 0);

    ctx.save();
    ctx.translate(this.x, contentY);

    for (const child of this.children) {
      // 子控件相对于内容区域定位
      child.render(ctx);
    }

    ctx.restore();
  }

  // 设置标题
  setTitle(title) {
    this.title = title;
    if (this.titleText) {
      this.titleText.setText(title);
    }
  }

  // 处理点击
  handleClick(x, y) {
    if (!this.enabled) return null;

    const localX = x - this.x;
    const localY = y - this.y;

    // 检查关闭按钮
    if (this.closeButton && this.closeButton.contains(localX, localY)) {
      return this.closeButton.handleClick(localX, localY);
    }

    // 检查子控件
    const contentY = this.showTitleBar ? this.titleHeight : 0;

    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child.contains && child.contains(localX, localY - contentY)) {
        if (child.handleClick) {
          return child.handleClick(localX, localY - contentY);
        }
      }
    }

    return null;
  }

  // 处理鼠标移动
  handleMouseMove(x, y) {
    if (!this.enabled) return false;

    const localX = x - this.x;
    const localY = y - this.y;

    // 检查关闭按钮悬停
    if (this.closeButton) {
      this.closeButton.handleMouseMove(localX, localY);
    }

    return super.handleMouseMove(x, y);
  }
}

// 模态框
export class Modal extends Panel {
  constructor(options = {}) {
    super(options);

    this.maskColor = options.maskColor || 'rgba(0, 0, 0, 0.7)';
    this.closeOnMask = options.closeOnMask !== false;
    this.showCloseButton = options.showCloseButton !== false;

    // 居中显示
    this.centered = options.centered !== false;
  }

  // 渲染
  render(ctx) {
    if (!this.visible) return;

    // 绘制遮罩
    ctx.fillStyle = this.maskColor;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 计算面板位置
    let panelX = this.x;
    let panelY = this.y;

    if (this.centered) {
      panelX = (ctx.canvas.width - this.width) / 2;
      panelY = (ctx.canvas.height - this.height) / 2;
    }

    // 保存原始位置
    const originalX = this.x;
    const originalY = this.y;

    // 设置面板位置
    this.x = panelX;
    this.y = panelY;

    // 渲染面板
    super.render(ctx);

    // 恢复原始位置
    this.x = originalX;
    this.y = originalY;
  }

  // 处理点击
  handleClick(x, y) {
    if (!this.enabled) return null;

    // 检查是否点击遮罩
    const centeredX = (this.ctx ? this.ctx.canvas.width : 800) / 2;
    const centeredY = (this.ctx ? this.ctx.canvas.height : 600) / 2;
    const panelX = centeredX - this.width / 2;
    const panelY = centeredY - this.height / 2;

    // 如果点击在遮罩区域且 closeOnMask 为 true
    if (this.closeOnMask) {
      if (x < panelX || x > panelX + this.width || y < panelY || y > panelY + this.height) {
        this.dispatchEvent('close');
        return { type: 'maskClick' };
      }
    }

    // 处理面板内点击
    return super.handleClick(x - panelX + this.x, y - panelY + this.y);
  }

  // 显示
  show() {
    this.visible = true;
    this.dispatchEvent('show');
  }

  // 隐藏
  hide() {
    this.visible = false;
    this.dispatchEvent('hide');
  }

  // 切换显示
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }
}

// 对话框（带确定/取消按钮）
export class Dialog extends Modal {
  constructor(options = {}) {
    super(options);

    this.message = options.message || '';
    this.confirmText = options.confirmText || '确定';
    this.cancelText = options.cancelText || '取消';
    this.showCancel = options.showCancel !== false;

    // 按钮
    this.confirmButton = null;
    this.cancelButton = null;
    this.messageText = null;

    // 初始化
    this._initComponents();
  }

  // 初始化组件
  _initComponents() {
    // 消息文本
    this.messageText = new TextBlock({
      text: this.message,
      color: '#ffffff',
      font: '14px PingFang SC, Microsoft YaHei, sans-serif',
      textAlign: 'center'
    });
    this.addChild(this.messageText);

    // 确认按钮
    this.confirmButton = new Button({
      text: this.confirmText,
      width: 80,
      height: 35,
      normalColor: '#e94560'
    });
    this.confirmButton.on('click', () => {
      this.dispatchEvent('confirm');
      this.hide();
    });
    this.addChild(this.confirmButton);

    // 取消按钮
    if (this.showCancel) {
      this.cancelButton = new Button({
        text: this.cancelText,
        width: 80,
        height: 35,
        normalColor: '#16213e',
        textColor: '#8892b0'
      });
      this.cancelButton.on('click', () => {
        this.dispatchEvent('cancel');
        this.hide();
      });
      this.addChild(this.cancelButton);
    }
  }

  // 渲染
  render(ctx) {
    if (!this.visible) return;

    // 遮罩
    ctx.fillStyle = this.maskColor;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 面板
    const panelWidth = this.width;
    const panelHeight = this.height;
    const panelX = (ctx.canvas.width - panelWidth) / 2;
    const panelY = (ctx.canvas.height - panelHeight) / 2;

    // 面板背景
    ctx.fillStyle = '#16213e';
    this.drawRoundedRect(ctx, panelX, panelY, panelWidth, panelHeight, 12);
    ctx.fill();

    // 标题
    if (this.title) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px PingFang SC, Microsoft YaHei, sans-serif';
      ctx.textAlign = 'center';
      drawTextWithShadow(ctx, this.title, ctx.canvas.width / 2, panelY + 30, { inheritContext: true });
    }

    // 消息
    const messageY = panelY + 60;
    this.messageText.setPosition(panelX + 20, messageY);
    this.messageText.setSize(panelWidth - 40, 60);
    this.messageText.render(ctx);

    // 按钮
    const buttonY = panelY + panelHeight - 60;
    const buttonWidth = 80;
    const buttonGap = 20;

    if (this.showCancel) {
      const cancelX = ctx.canvas.width / 2 - buttonWidth - buttonGap / 2;
      this.cancelButton.setPosition(cancelX, buttonY);
      this.cancelButton.render(ctx);
    }

    const confirmX = ctx.canvas.width / 2 + buttonGap / 2;
    this.confirmButton.setPosition(confirmX, buttonY);
    this.confirmButton.render(ctx);
  }

  // 设置消息
  setMessage(message) {
    this.message = message;
    if (this.messageText) {
      this.messageText.setText(message);
    }
  }
}
