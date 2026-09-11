// UI Engine - 列表视图组件

import { BaseComponent } from './base.js';
import { drawTextWithShadow } from '../rendering/text.js';

export class ListView extends BaseComponent {
  constructor(options = {}) {
    super(options);

    // 默认背景颜色（继承自父容器主题）
    if (!options.backgroundColor) {
      this.backgroundColor = this.colors?.panel || 'rgba(22, 33, 62, 0.95)';
    }

    this.items = options.items || [];
    this.itemHeight = options.itemHeight || 50;
    this.itemRenderer = options.itemRenderer || null;
    this.selectedIndex = options.selectedIndex || -1;
    this.multiSelect = options.multiSelect || false;
    this.selectedItems = options.selectedItems || new Set();

    // 滚动
    this.scrollY = 0;
    this.maxScrollY = 0;
    this.scrollSpeed = 300; // 像素/秒

    // 样式（使用 theme 颜色）
    this.rowBgColor = options.rowBgColor || null;
    this.rowAltBgColor = options.rowAltBgColor || null;
    this.selectedBgColor = options.selectedBgColor || null;
    this.hoverBgColor = options.hoverBgColor || null;

    // 排序
    this.sortFn = options.sortFn || null;

    // 字段颜色映射: { field: string, colors: { [value]: colorString } }
    this.fieldColors = options.fieldColors || null;

    // 字段标签映射: { field: string, templates: { [value]: string } }
    this.itemLabel = options.itemLabel || null;

    // 选中指示器
    this.showIndicator = options.showIndicator !== false;
    this.selectedIndicator = options.selectedIndicator || '●';
    this.unselectedIndicator = options.unselectedIndicator || '○';

    // 切换选中状态（点击已选中项时取消选中）
    this.toggleSelection = options.toggleSelection || false;

    // 内部状态
    this._hoveredIndex = -1;
    this._isDragging = false;
    this._lastY = 0;
    this._sortedItems = []; // 排序后的项

    // 事件回调
    this.onItemClick = options.onItemClick || null;
    this.onItemSelect = options.onItemSelect || null;
    this.onScroll = options.onScroll || null;

    // 交互 action（用于 UIEngine 事件冒泡）
    this.action = options.action || 'itemClick';
    this.actionDataFn = options.actionDataFn || null; // (item) => ({ key: value })

    // 初始化排序
    this._applySort();
  }

  // 应用排序
  _applySort() {
    if (this.sortFn) {
      this._sortedItems = [...this.items].sort(this.sortFn);
    } else {
      this._sortedItems = [...this.items];
    }
  }

  // 渲染
  render(ctx) {
    if (!this.visible) return;

    ctx.save();

    // 绘制背景
    if (this.backgroundColor && this.backgroundColor !== 'transparent') {
      ctx.fillStyle = this.backgroundColor;
      this.drawRoundedRect(ctx, this.x, this.y, this.width, this.height, 8);
      ctx.fill();
    }

    // 裁剪内容区域
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.width, this.height);
    ctx.clip();

    // 渲染列表项
    this._renderItems(ctx);

    // 渲染滚动条
    this._renderScrollBar(ctx);

    ctx.restore();
  }

  // 渲染列表项
  _renderItems(ctx) {
    const visibleStart = Math.floor(this.scrollY / this.itemHeight);
    const visibleEnd = Math.ceil((this.scrollY + this.height) / this.itemHeight);

    for (let i = visibleStart; i < visibleEnd && i < this._sortedItems.length; i++) {
      const itemY = this.y + i * this.itemHeight - this.scrollY;

      // 跳过不可见的项
      if (itemY + this.itemHeight < this.y || itemY > this.y + this.height) {
        continue;
      }

      const itemData = this._sortedItems[i];
      const isSelected = i === this.selectedIndex;
      const isHovered = i === this._hoveredIndex;

      // 背景色（使用 theme 颜色）
      const colors = this.colors || {};
      let bgColor = i % 2 === 0
        ? (this.rowBgColor || colors.bgLight || '#16213e')
        : (this.rowAltBgColor || colors.bg || '#1a1a2e');
      if (isSelected) {
        bgColor = this.selectedBgColor || colors.accent || '#e94560';
      } else if (isHovered) {
        bgColor = this.hoverBgColor || colors.bgLight || '#2a2a4e';
      }

      ctx.fillStyle = bgColor;
      this.drawRoundedRect(ctx, this.x + 2, itemY + 2, this.width - 4, this.itemHeight - 4, 8);
      ctx.fill();

      // 渲染指示器
      if (this.showIndicator) {
        ctx.fillStyle = this.colors?.text || '#ffffff';
        ctx.font = '12px PingFang SC, Microsoft YaHei, sans-serif';
        ctx.textAlign = 'left';
        const indicator = isSelected ? this.selectedIndicator : this.unselectedIndicator;
        drawTextWithShadow(ctx, indicator, this.x + 10, itemY + this.itemHeight / 2 + 4, { inheritContext: true });
      }

      // 渲染项内容
      if (this.itemRenderer) {
        // 计算文字颜色（根据 fieldColors 配置）
        let textColor = this.colors?.text || '#ffffff';
        if (this.fieldColors && this.fieldColors.field && this.fieldColors.colors) {
          const fieldValue = itemData[this.fieldColors.field];
          if (fieldValue && this.fieldColors.colors[fieldValue]) {
            textColor = this.fieldColors.colors[fieldValue];
          }
        }

        this.itemRenderer(ctx, itemData, i, {
          x: this.x,
          y: itemY,
          width: this.width,
          height: this.itemHeight,
          selected: isSelected,
          hovered: isHovered,
          textColor: textColor,
          indicatorOffset: this.showIndicator ? 20 : 0
        });
      }
    }
  }

  // 渲染滚动条
  _renderScrollBar(ctx) {
    if (this.maxScrollY <= 0) return;

    const scrollBarWidth = 8;
    const scrollBarX = this.x + this.width - scrollBarWidth - 2;
    const scrollBarHeight = this.height * (this.height / (this.items.length * this.itemHeight));
    const scrollBarY = this.y + (this.scrollY / this.maxScrollY) * (this.height - scrollBarHeight);

    // 滚动条背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(scrollBarX, this.y, scrollBarWidth, this.height);

    // 滚动条
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(scrollBarX, scrollBarY, scrollBarWidth, scrollBarHeight);
  }

  // 设置列表项
  setItems(items) {
    this.items = items;
    this._applySort();
    this._updateMaxScroll();
    this.selectedIndex = -1;
    this.selectedItems.clear();
  }

  // 添加项
  addItem(item) {
    this.items.push(item);
    this._applySort();
    this._updateMaxScroll();
  }

  // 移除项
  removeItem(index) {
    if (index >= 0 && index < this._sortedItems.length) {
      const itemToRemove = this._sortedItems[index];
      const originalIndex = this.items.indexOf(itemToRemove);
      if (originalIndex !== -1) {
        this.items.splice(originalIndex, 1);
      }
      this._applySort();
      if (this.selectedIndex === index) {
        this.selectedIndex = -1;
      } else if (this.selectedIndex > index) {
        this.selectedIndex--;
      }
      this._updateMaxScroll();
    }
  }

  // 滚动到指定项
  scrollToIndex(index) {
    const targetY = index * this.itemHeight;
    this.scrollY = Math.max(0, Math.min(targetY, this.maxScrollY));

    if (this.onScroll) {
      this.onScroll(this.scrollY);
    }
  }

  // 滚动到顶部
  scrollToTop() {
    this.scrollY = 0;
    if (this.onScroll) {
      this.onScroll(this.scrollY);
    }
  }

  // 滚动到底部
  scrollToBottom() {
    this.scrollY = this.maxScrollY;
    if (this.onScroll) {
      this.onScroll(this.scrollY);
    }
  }

  // 更新最大滚动值
  _updateMaxScroll() {
    const contentHeight = this._sortedItems.length * this.itemHeight;
    this.maxScrollY = Math.max(0, contentHeight - this.height);
  }

  // 清除选择
  clearSelection() {
    this.selectedIndex = -1;
    this.selectedItems.clear();
  }

  // 处理点击（支持 UIEngine 事件冒泡）
  handleClick(x, y) {
    if (!this.enabled) return null;

    const itemIndex = this._getItemIndexAt(y);
    if (itemIndex >= 0 && itemIndex < this._sortedItems.length) {
      const clickedItem = this._sortedItems[itemIndex];

      // 如果 toggleSelection 为 true 且点击的是已选中项，则取消选中
      if (this.toggleSelection && this.selectedIndex === itemIndex) {
        this.selectedIndex = -1;
        if (this.onItemClick) {
          this.onItemClick(null, -1);
        }
        return {
          action: this.action,
          data: { item: null, index: -1 }
        };
      }

      this.selectedIndex = itemIndex;

      if (this.onItemClick) {
        this.onItemClick(clickedItem, itemIndex);
      }

      // 构造 action data
      let data = { item: clickedItem, index: itemIndex };
      if (this.actionDataFn) {
        data = { ...data, ...this.actionDataFn(clickedItem) };
      }

      // 返回标准化格式
      return {
        action: this.action,
        data: data
      };
    }

    return null;
  }

  // 处理鼠标移动
  handleMouseMove(x, y) {
    if (!this.enabled) return false;

    const oldHovered = this._hoveredIndex;
    this._hoveredIndex = this._getItemIndexAt(y);

    if (this._hoveredIndex !== oldHovered) {
      return true; // 需要重绘
    }

    return false;
  }

  // 处理鼠标按下（开始拖拽滚动）
  handleMouseDown(x, y) {
    if (!this.enabled) return false;

    if (this.maxScrollY > 0 && x >= this.x + this.width - 15) {
      this._isDragging = true;
      this._lastY = y;
      return true;
    }

    return false;
  }

  // 处理鼠标拖拽
  handleDrag(x, y, deltaY) {
    if (!this.enabled || this.maxScrollY <= 0) return;

    this.scrollY = Math.max(0, Math.min(this.scrollY - deltaY, this.maxScrollY));

    if (this.onScroll) {
      this.onScroll(this.scrollY);
    }
  }

  // 处理鼠标释放
  handleMouseUp(x, y) {
    this._isDragging = false;
  }

  // 获取指定Y坐标对应的项索引
  _getItemIndexAt(y) {
    const itemY = y - this.y + this.scrollY;
    return Math.floor(itemY / this.itemHeight);
  }

  // 更新
  update(dt) {
    // 可以添加滚动动画等
  }
}
