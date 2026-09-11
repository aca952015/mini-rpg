// UI Engine - 表格面板组件

import { BaseComponent } from './base.js';
import { drawTextWithShadow } from '../rendering/text.js';

export class TablePanel extends BaseComponent {
  constructor(options = {}) {
    super(options);

    this.columns = options.columns || [];
    this.rows = options.rows || [];
    this.rowHeight = options.rowHeight || 40;
    this.headerHeight = options.headerHeight || 45;
    this.showHeader = options.showHeader !== false;

    // 样式（使用 theme）
    this.headerBgColor = options.headerBgColor || null;
    this.rowBgColor = options.rowBgColor || null;
    this.rowAltBgColor = options.rowAltBgColor || null;
    this.gridColor = options.gridColor || null;
    this.gridWidth = options.gridWidth || 1;
    this.headerTextColor = options.headerTextColor || null;
    this.cellTextColor = options.cellTextColor || null;

    // 滚动
    this.scrollY = 0;
    this.maxScrollY = 0;

    // 选中
    this.selectedRow = -1;
    this.hoveredRow = -1;

    // 事件
    this.onRowClick = options.onRowClick || null;
    this.onCellClick = options.onCellClick || null;
  }

  // 渲染
  render(ctx) {
    if (!this.visible) return;

    ctx.save();

    // 裁剪内容区域
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.width, this.height);
    ctx.clip();

    // 渲染表头
    if (this.showHeader) {
      this._renderHeader(ctx);
    }

    // 渲染行
    this._renderRows(ctx);

    // 渲染滚动条
    this._renderScrollBar(ctx);

    ctx.restore();
  }

  // 渲染表头
  _renderHeader(ctx) {
    const headerY = this.y;

    // 表头背景
    ctx.fillStyle = this.headerBgColor;
    ctx.fillRect(this.x, headerY, this.width, this.headerHeight);

    // 表头底部边框
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = this.gridWidth;
    ctx.beginPath();
    ctx.moveTo(this.x, headerY + this.headerHeight);
    ctx.lineTo(this.x + this.width, headerY + this.headerHeight);
    ctx.stroke();

    // 列标题
    let currentX = this.x;
    ctx.font = 'bold 13px PingFang SC, Microsoft YaHei, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < this.columns.length; i++) {
      const col = this.columns[i];
      const colWidth = this._getColumnWidth(i);

      ctx.fillStyle = this.headerTextColor;
      const textX = currentX + 10;
      const textY = headerY + this.headerHeight / 2;

      // 根据对齐方式调整
      if (col.align === 'center') {
        ctx.textAlign = 'center';
        textX = currentX + colWidth / 2;
      } else if (col.align === 'right') {
        ctx.textAlign = 'right';
        textX = currentX + colWidth - 10;
      }

      drawTextWithShadow(ctx, col.title || '', textX, textY, { inheritContext: true });

      // 列分隔线
      if (i < this.columns.length - 1) {
        ctx.strokeStyle = this.gridColor;
        ctx.beginPath();
        ctx.moveTo(currentX + colWidth, headerY);
        ctx.lineTo(currentX + colWidth, headerY + this.headerHeight);
        ctx.stroke();
      }

      currentX += colWidth;
    }
  }

  // 渲染行
  _renderRows(ctx) {
    const startY = this.showHeader ? this.y + this.headerHeight : this.y;
    const visibleStart = Math.floor(this.scrollY / this.rowHeight);
    const visibleEnd = Math.ceil((this.scrollY + this.height - (this.showHeader ? this.headerHeight : 0)) / this.rowHeight);

    for (let i = visibleStart; i < visibleEnd && i < this.rows.length; i++) {
      const row = this.rows[i];
      const rowY = startY + i * this.rowHeight - this.scrollY;

      // 跳过不可见的行
      if (rowY + this.rowHeight < startY || rowY > startY + this.height - (this.showHeader ? this.headerHeight : 0)) {
        continue;
      }

      // 行背景
      let bgColor = i % 2 === 0 ? this.rowBgColor : this.rowAltBgColor;
      if (i === this.selectedRow) {
        bgColor = '#e94560';
      } else if (i === this.hoveredRow) {
        bgColor = '#2a2a4e';
      }

      ctx.fillStyle = bgColor;
      ctx.fillRect(this.x, rowY, this.width, this.rowHeight);

      // 行底部边框
      ctx.strokeStyle = this.gridColor;
      ctx.lineWidth = this.gridWidth;
      ctx.beginPath();
      ctx.moveTo(this.x, rowY + this.rowHeight);
      ctx.lineTo(this.x + this.width, rowY + this.rowHeight);
      ctx.stroke();

      // 单元格内容
      let currentX = this.x;
      for (let j = 0; j < this.columns.length; j++) {
        const col = this.columns[j];
        const colWidth = this._getColumnWidth(j);
        const cellValue = row[col.key] !== undefined ? row[col.key] : '';

        ctx.fillStyle = i === this.selectedRow ? '#ffffff' : this.cellTextColor;
        ctx.font = '13px PingFang SC, Microsoft YaHei, sans-serif';
        ctx.textBaseline = 'middle';

        let textX = currentX + 10;
        if (col.align === 'center') {
          ctx.textAlign = 'center';
          textX = currentX + colWidth / 2;
        } else if (col.align === 'right') {
          ctx.textAlign = 'right';
          textX = currentX + colWidth - 10;
        } else {
          ctx.textAlign = 'left';
        }

        // 渲染单元格（支持自定义渲染函数）
        if (col.renderer) {
          col.renderer(ctx, cellValue, row, {
            x: currentX,
            y: rowY,
            width: colWidth,
            height: this.rowHeight,
            row,
            column: col,
            rowIndex: i,
            columnIndex: j
          });
        } else {
          drawTextWithShadow(ctx, cellValue, textX, rowY + this.rowHeight / 2, { inheritContext: true });
        }

        // 单元格分隔线
        if (j < this.columns.length - 1) {
          ctx.strokeStyle = this.gridColor;
          ctx.beginPath();
          ctx.moveTo(currentX + colWidth, rowY);
          ctx.lineTo(currentX + colWidth, rowY + this.rowHeight);
          ctx.stroke();
        }

        currentX += colWidth;
      }
    }
  }

  // 渲染滚动条
  _renderScrollBar(ctx) {
    if (this.maxScrollY <= 0) return;

    const scrollBarWidth = 8;
    const scrollBarX = this.x + this.width - scrollBarWidth - 2;
    const scrollBarHeight = this.height * (this.height / (this.rows.length * this.rowHeight));
    const scrollBarY = this.y + (this.scrollY / this.maxScrollY) * (this.height - scrollBarHeight);

    // 滚动条背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(scrollBarX, this.y, scrollBarWidth, this.height);

    // 滚动条
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(scrollBarX, scrollBarY, scrollBarWidth, scrollBarHeight);
  }

  // 获取列宽度
  _getColumnWidth(index) {
    const col = this.columns[index];
    if (col && col.width) {
      // 如果是百分比
      if (typeof col.width === 'string' && col.width.endsWith('%')) {
        return this.width * (parseFloat(col.width) / 100);
      }
      return col.width;
    }
    return this.width / this.columns.length;
  }

  // 设置列配置
  setColumns(columns) {
    this.columns = columns;
  }

  // 设置行数据
  setRows(rows) {
    this.rows = rows;
    this._updateMaxScroll();
    this.selectedRow = -1;
  }

  // 添加行
  addRow(row) {
    this.rows.push(row);
    this._updateMaxScroll();
  }

  // 移除行
  removeRow(index) {
    if (index >= 0 && index < this.rows.length) {
      this.rows.splice(index, 1);
      if (this.selectedRow === index) {
        this.selectedRow = -1;
      } else if (this.selectedRow > index) {
        this.selectedRow--;
      }
      this._updateMaxScroll();
    }
  }

  // 更新最大滚动值
  _updateMaxScroll() {
    const contentHeight = this.rows.length * this.rowHeight;
    const visibleHeight = this.height - (this.showHeader ? this.headerHeight : 0);
    this.maxScrollY = Math.max(0, contentHeight - visibleHeight);
  }

  // 处理点击
  handleClick(x, y) {
    if (!this.enabled) return null;

    const rowIndex = this._getRowIndexAt(y);
    if (rowIndex >= 0 && rowIndex < this.rows.length) {
      this.selectedRow = rowIndex;

      const result = {
        type: 'rowClick',
        row: this.rows[rowIndex],
        rowIndex
      };

      if (this.onRowClick) {
        this.onRowClick(result);
      }

      return result;
    }

    return null;
  }

  // 处理鼠标移动
  handleMouseMove(x, y) {
    if (!this.enabled) return false;

    const oldHovered = this.hoveredRow;
    this.hoveredRow = this._getRowIndexAt(y);

    return this.hoveredRow !== oldHovered;
  }

  // 获取指定Y坐标对应的行索引
  _getRowIndexAt(y) {
    const startY = this.showHeader ? this.y + this.headerHeight : this.y;
    const itemY = y - startY + this.scrollY;
    return Math.floor(itemY / this.rowHeight);
  }

  // 更新
  update(dt) {
    // 可以添加滚动动画等
  }
}
