// TabViewport - 带标签栏的视口基类
// 提供分类标签的渲染和点击检测功能

import { Viewport } from './viewport.js';
import { drawTextWithShadow } from '../rendering/text.js';

export class TabViewport extends Viewport {
  constructor(options = {}) {
    super(options);

    this.name = options.name || 'tabViewport';

    // 标签配置
    this.tabs = options.tabs || [];
    this.activeTab = options.activeTab || this.tabs[0]?.key || '';

    // tab 距离顶部的偏移
    this.tabYOffset = options.tabYOffset !== undefined ? options.tabYOffset : 10;

    // tab 切换回调
    this.onTabChange = options.onTabChange || null;
  }

  // 渲染分类标签（平均平铺在整个view宽度上）
  renderTabs(tabs, activeTab, tabY) {
    const { ctx, width, colors } = this;
    const tabWidth = Math.floor(width / tabs.length);
    const tabHeight = 30;

    tabs.forEach((tab, index) => {
      const x = index * tabWidth;
      const isActive = activeTab === tab.key;

      // 标签背景
      ctx.fillStyle = isActive ? colors.accent : colors.panel;
      this.drawRoundedRect(ctx, x + 2, tabY, tabWidth - 4, tabHeight, 5);
      ctx.fill();

      // 标签文字
      ctx.fillStyle = colors.text;
      ctx.font = '12px PingFang SC, Microsoft YaHei, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      drawTextWithShadow(ctx, tab.name, x + tabWidth / 2, tabY + tabHeight / 2, { inheritContext: true });
      ctx.textBaseline = 'alphabetic';
    });
  }

  // 检测标签点击
  detectTabClick(x, y, tabs, tabY, tabStartX, tabWidth, tabHeight) {
    for (let i = 0; i < tabs.length; i++) {
      const tabX = tabStartX + i * tabWidth;
      if (x >= tabX && x <= tabX + tabWidth && y >= tabY && y <= tabY + tabHeight) {
        return tabs[i].key;
      }
    }
    return null;
  }

  // 获取标签的x坐标范围
  getTabRange(tabs, tabY) {
    const tabWidth = Math.floor(this.width / tabs.length);
    const tabStartX = 0;
    const tabHeight = 30;
    return { tabY, tabStartX, tabWidth, tabHeight };
  }

  // 获取 tab Y 坐标
  getTabY() {
    return this.y + this.tabYOffset;
  }

  // 渲染标签栏（供子类在 renderContent 中调用）
  renderTabBar() {
    if (this.tabs.length === 0) return;
    const tabY = this.getTabY();
    this.renderTabs(this.tabs, this.activeTab, tabY);
    return tabY;
  }

  // 处理标签点击
  handleTabClick(tabKey) {
    // 更新当前选中的标签
    this.activeTab = tabKey;
    if (this.onTabChange) {
      this.onTabChange(tabKey);
    }
  }

  // 检测并处理标签点击（供子类在 handleClick 中调用）
  detectAndHandleTabClick(x, y) {
    if (this.tabs.length === 0) return false;

    const tabY = this.getTabY();
    const { tabStartX, tabWidth, tabHeight } = this.getTabRange(this.tabs, tabY);
    const clickedTab = this.detectTabClick(x, y, this.tabs, tabY, tabStartX, tabWidth, tabHeight);

    if (clickedTab && clickedTab !== this.activeTab) {
      this.handleTabClick(clickedTab);
      return true;
    }
    return false;
  }

  // 处理点击事件（覆盖父类，优先处理 Tab 点击）
  handleClick(x, y) {
    // 先检测 Tab 点击（这是 UI 内部操作，不触发 action）
    if (this.detectAndHandleTabClick(x, y)) {
      return null; // Tab 切换是内部状态变更，不触发游戏 action
    }

    // 没有点击 Tab，交给父类处理子控件事件冒泡
    return super.handleClick(x, y);
  }
}
