// UI Engine - 标签页视图组件

import { BaseComponent } from './base.js';
import { getPlatform } from '../platform/index.js';
import { TextBlock } from './textBlock.js';
import { drawTextWithShadow } from '../rendering/text.js';

export class TabView extends BaseComponent {
  constructor(options = {}) {
    super(options);

    this.tabs = options.tabs || [];
    this.activeTab = options.activeTab || null;
    this.tabPosition = options.tabPosition || 'top';
    this.tabHeight = options.tabHeight || 40;

    // 样式（使用 theme）
    this.tabBgColor = options.tabBgColor || null;
    this.activeTabBgColor = options.activeTabBgColor || null;
    this.tabTextColor = options.tabTextColor || null;
    this.activeTabTextColor = options.activeTabTextColor || null;

    // 内部组件
    this.tabButtons = [];
    this.contentPanel = null;

    // 初始化
    this._initTabs();
  }

  // 初始化标签
  _initTabs() {
    if (this.tabs.length > 0 && !this.activeTab) {
      this.activeTab = this.tabs[0].id;
    }
  }

  // 渲染
  render(ctx) {
    if (!this.visible) return;

    ctx.save();

    // 渲染标签栏
    this._renderTabBar(ctx);

    // 渲染内容区域
    this._renderContent(ctx);

    ctx.restore();
  }

  // 渲染标签栏
  _renderTabBar(ctx) {
    const tabWidth = this.width / this.tabs.length;

    const colors = this.colors || {};
    this.tabs.forEach((tab, index) => {
      const isActive = tab.id === this.activeTab;
      const x = index * tabWidth;
      const y = this.tabPosition === 'top' ? this.y : this.y + this.height - this.tabHeight;

      // 标签背景
      ctx.fillStyle = isActive
        ? (this.activeTabBgColor || colors.accent || '#e94560')
        : (this.tabBgColor || colors.bgLight || '#16213e');
      ctx.fillRect(x, y, tabWidth, this.tabHeight);

      // 标签文字
      ctx.fillStyle = isActive
        ? (this.activeTabTextColor || colors.text || '#ffffff')
        : (this.tabTextColor || colors.textSecondary || '#8892b0');
      ctx.font = '14px PingFang SC, Microsoft YaHei, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 如果有图标，图标+文字
      const content = tab.icon ? `${tab.icon} ${tab.title}` : tab.title;
      drawTextWithShadow(ctx, content, x + tabWidth / 2, y + this.tabHeight / 2, { inheritContext: true });
    });
  }

  // 渲染内容区域
  _renderContent(ctx) {
    const contentY = this.tabPosition === 'top'
      ? this.y + this.tabHeight
      : this.y;
    const contentHeight = this.height - this.tabHeight;

    // 内容区域背景
    ctx.fillStyle = this.backgroundColor || 'transparent';
    ctx.fillRect(this.x, contentY, this.width, contentHeight);

    // 裁剪内容区域
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x, contentY, this.width, contentHeight);
    ctx.clip();

    // 渲染当前激活标签的内容
    const activeTab = this.tabs.find(t => t.id === this.activeTab);
    if (activeTab && activeTab.content) {
      activeTab.content.render(ctx);
    }

    ctx.restore();
  }

  // 设置激活标签
  setActiveTab(id) {
    if (this.activeTab === id) return;

    const tab = this.tabs.find(t => t.id === id);
    if (tab) {
      const oldTab = this.activeTab;
      this.activeTab = id;
      this.dispatchEvent('tabChange', { oldTab, newTab: id });
    }
  }

  // 获取当前激活标签
  getActiveTab() {
    return this.activeTab;
  }

  // 添加标签
  addTab(id, title, icon, content) {
    this.tabs.push({ id, title, icon, content });
    if (!this.activeTab) {
      this.activeTab = id;
    }
  }

  // 移除标签
  removeTab(id) {
    const index = this.tabs.findIndex(t => t.id === id);
    if (index !== -1) {
      this.tabs.splice(index, 1);
      if (this.activeTab === id && this.tabs.length > 0) {
        this.activeTab = this.tabs[0].id;
      }
    }
  }

  // 处理点击
  handleClick(x, y) {
    if (!this.enabled) return null;

    // 检测标签栏点击
    const tabWidth = this.width / this.tabs.length;
    const tabY = this.tabPosition === 'top' ? this.y : this.y + this.height - this.tabHeight;

    for (let i = 0; i < this.tabs.length; i++) {
      const tabX = i * tabWidth;
      if (x >= tabX && x < tabX + tabWidth && y >= tabY && y < tabY + this.tabHeight) {
        const tabId = this.tabs[i].id;
        if (tabId !== this.activeTab) {
          this.setActiveTab(tabId);
          return { type: 'tabChange', tabId };
        }
        return null;
      }
    }

    // 检测内容区域点击
    const activeTab = this.tabs.find(t => t.id === this.activeTab);
    if (activeTab && activeTab.content && activeTab.content.handleClick) {
      return activeTab.content.handleClick(x, y);
    }

    return null;
  }

  // 处理鼠标移动（悬停效果）
  handleMouseMove(x, y) {
    if (!this.enabled) return false;

    const tabWidth = this.width / this.tabs.length;
    const tabY = this.tabPosition === 'top' ? this.y : this.y + this.height - this.tabHeight;

    for (let i = 0; i < this.tabs.length; i++) {
      const tabX = i * tabWidth;
      if (x >= tabX && x < tabX + tabWidth && y >= tabY && y < tabY + this.tabHeight) {
        getPlatform().setCursor?.('pointer');
        return true;
      }
    }

    getPlatform().setCursor?.('default');
    return false;
  }
}
