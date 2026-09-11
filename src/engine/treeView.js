// UI Engine - 树形视图组件

import { BaseComponent } from './base.js';
import { drawTextWithShadow } from '../rendering/text.js';

// 树形节点
export class TreeItem extends BaseComponent {
  constructor(options = {}) {
    super(options);

    this.data = options.data || {};
    this.children = options.children || [];
    this.depth = options.depth || 0;
    this.expanded = options.expanded || false;
    this.selected = options.selected || false;
    this.hasChildren = options.hasChildren !== false;

    // 样式
    this.indent = options.indent || 20;
    this.nodeHeight = options.nodeHeight || 30;
    this.expandIcon = options.expandIcon || '▶';
    this.collapseIcon = options.collapseIcon || '▼';
    this.icon = options.icon || '';
    this.label = options.label || '';

    // 内部组件
    this.childItems = [];
  }

  // 渲染
  render(ctx) {
    if (!this.visible) return;

    ctx.save();

    // 绘制节点背景
    if (this.selected) {
      ctx.fillStyle = '#e94560';
      ctx.fillRect(this.x, this.y, this.width, this.nodeHeight);
    }

    // 绘制展开/收起图标
    if (this.hasChildren) {
      ctx.fillStyle = '#8892b0';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const icon = this.expanded ? this.collapseIcon : this.expandIcon;
      drawTextWithShadow(ctx, icon, this.x + 5, this.y + this.nodeHeight / 2, { inheritContext: true });
    }

    // 绘制图标
    if (this.icon) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      drawTextWithShadow(ctx, this.icon, this.x + this.indent, this.y + this.nodeHeight / 2, { inheritContext: true });
    }

    // 绘制标签
    ctx.fillStyle = this.selected ? '#ffffff' : '#ffffff';
    ctx.font = '14px PingFang SC, Microsoft YaHei, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const labelX = this.x + this.indent + (this.icon ? 20 : 0) + 10;
    drawTextWithShadow(ctx, this.label, labelX, this.y + this.nodeHeight / 2, { inheritContext: true });

    ctx.restore();

    // 渲染子节点
    if (this.expanded && this.children.length > 0) {
      let childY = this.y + this.nodeHeight;
      for (const child of this.children) {
        child.setPosition(this.x, childY);
        child.render(ctx);
        childY += child.getTotalHeight();
      }
    }
  }

  // 获取节点总高度
  getTotalHeight() {
    if (!this.expanded || this.children.length === 0) {
      return this.nodeHeight;
    }

    let height = this.nodeHeight;
    for (const child of this.children) {
      height += child.getTotalHeight();
    }
    return height;
  }

  // 切换展开状态
  toggle() {
    if (!this.hasChildren) return;

    this.expanded = !this.expanded;
    this.dispatchEvent('toggle', { expanded: this.expanded });
  }

  // 设置展开状态
  setExpanded(expanded) {
    if (this.expanded === expanded) return;

    this.expanded = expanded;
    this.dispatchEvent('toggle', { expanded: this.expanded });
  }

  // 设置选中状态
  setSelected(selected) {
    this.selected = selected;
  }

  // 添加子节点
  addChild(child) {
    child.depth = this.depth + 1;
    this.children.push(child);
    this.hasChildren = true;
  }

  // 移除子节点
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
    }
    this.hasChildren = this.children.length > 0;
  }

  // 获取子节点
  getChildren() {
    return this.children;
  }

  // 检测点击
  contains(x, y) {
    // 检查当前节点
    if (super.contains(x, y)) {
      return { type: 'node', node: this };
    }

    // 检查子节点
    if (this.expanded) {
      for (const child of this.children) {
        const result = child.contains(x, y);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }
}

// 树形视图
export class TreeView extends BaseComponent {
  constructor(options = {}) {
    super(options);

    this.root = options.root || null;
    this.expandedNodes = new Set();
    this.selectedNode = options.selectedNode || null;

    // 样式
    this.nodeHeight = options.nodeHeight || 30;
    this.indent = options.indent || 20;
    this.selectedBgColor = options.selectedBgColor || '#e94560';
    this.hoverBgColor = options.hoverBgColor || '#2a2a4e';

    // 滚动
    this.scrollY = 0;
    this.maxScrollY = 0;

    // 事件
    this.onNodeClick = options.onNodeClick || null;
    this.onNodeExpand = options.onNodeExpand || null;
    this.onNodeCollapse = options.onNodeCollapse || null;

    // 内部状态
    this._hoveredNode = null;
  }

  // 渲染
  render(ctx) {
    if (!this.visible) return;

    ctx.save();

    // 裁剪内容区域
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.width, this.height);
    ctx.clip();

    // 渲染根节点
    if (this.root) {
      this.root.setPosition(this.x, this.y - this.scrollY);
      this.root.render(ctx);
    }

    ctx.restore();
  }

  // 设置根节点
  setRoot(root) {
    this.root = root;
    this._updateExpandedNodes();
  }

  // 展开节点
  expandNode(node) {
    node.setExpanded(true);
    this.expandedNodes.add(node);
    this._updateMaxScroll();

    if (this.onNodeExpand) {
      this.onNodeExpand(node);
    }
  }

  // 收起节点
  collapseNode(node) {
    node.setExpanded(false);
    this.expandedNodes.delete(node);
    this._updateMaxScroll();

    if (this.onNodeCollapse) {
      this.onNodeCollapse(node);
    }
  }

  // 切换节点状态
  toggleNode(node) {
    if (node.expanded) {
      this.collapseNode(node);
    } else {
      this.expandNode(node);
    }
  }

  // 获取展开的节点
  getExpandedNodes() {
    return Array.from(this.expandedNodes);
  }

  // 更新最大滚动值
  _updateMaxScroll() {
    if (!this.root) {
      this.maxScrollY = 0;
      return;
    }

    const totalHeight = this.root.getTotalHeight();
    this.maxScrollY = Math.max(0, totalHeight - this.height);
  }

  // 更新展开状态
  _updateExpandedNodes() {
    if (this.root) {
      this._updateNodeExpanded(this.root);
    }
  }

  // 更新节点展开状态
  _updateNodeExpanded(node) {
    if (this.expandedNodes.has(node)) {
      node.setExpanded(true);
    } else {
      node.setExpanded(false);
    }

    for (const child of node.children) {
      this._updateNodeExpanded(child);
    }
  }

  // 处理点击
  handleClick(x, y) {
    if (!this.enabled) return null;

    const localY = y - this.y + this.scrollY;
    const result = this.root ? this.root.contains(x, localY) : null;

    if (result && result.type === 'node') {
      const node = result.node;

      // 如果点击的是展开/收起图标区域
      const iconX = node.x + 5;
      if (x >= iconX && x <= iconX + 15) {
        this.toggleNode(node);
        return { type: 'toggle', node };
      }

      // 选中节点
      this.selectedNode = node;
      node.setSelected(true);

      if (this.onNodeClick) {
        this.onNodeClick(node);
      }

      return { type: 'nodeClick', node };
    }

    return null;
  }

  // 处理鼠标移动
  handleMouseMove(x, y) {
    if (!this.enabled) return false;

    const localY = y - this.y + this.scrollY;
    const result = this.root ? this.root.contains(x, localY) : null;

    if (result && result.type === 'node') {
      const node = result.node;
      if (this._hoveredNode !== node) {
        this._hoveredNode = node;
        return true;
      }
    } else if (this._hoveredNode) {
      this._hoveredNode = null;
      return true;
    }

    return false;
  }

  // 更新
  update(dt) {
    // 可以添加动画等
  }
}
