// UI Engine - 瓦片/精灵图组件
// 用于存储和管理切割后的图像数组

import { BaseComponent } from './base.js';
import { getPlatform } from '../platform/index.js';

export class Tiles extends BaseComponent {
  constructor(options = {}) {
    super(options);

    // 图片源
    this.image = options.image || null;
    this.imageSrc = options.imageSrc || '';

    // 瓦片尺寸
    this.tileWidth = options.tileWidth || 32;
    this.tileHeight = options.tileHeight || 32;

    // 网格配置
    this.columns = options.columns || 1;  // 列数
    this.rows = options.rows || 1;        // 行数
    this.totalTiles = options.totalTiles || this.columns * this.rows;

    // 瓦片数据数组
    this.tiles = [];

    // 加载状态
    this.loaded = false;

    // 加载图片
    if (this.imageSrc) {
      this.loadImage(this.imageSrc);
    } else if (this.image) {
      this._generateTiles();
    }
  }

  // 加载图片
  loadImage(src) {
    this.image = getPlatform().createImage();
    this.image.onload = () => {
      this.loaded = true;
      this._generateTiles();
      this.dispatchEvent('load');
    };
    this.image.onerror = () => {
      console.error('Tiles 图片加载失败:', this.imageSrc);
      this.dispatchEvent('error', { src: this.imageSrc });
    };
    this.image.src = src;
  }

  // 生成瓦片数据
  _generateTiles() {
    if (!this.image) return;

    this.tiles = [];
    const imageWidth = this.image.width || 0;
    const imageHeight = this.image.height || 0;

    // 如果没有指定行列，则根据图片尺寸计算
    if (this.columns === 1 && this.rows === 1) {
      this.columns = Math.floor(imageWidth / this.tileWidth);
      this.rows = Math.floor(imageHeight / this.tileHeight);
      this.totalTiles = this.columns * this.rows;
    }

    // 生成每个瓦片的位置信息
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        const index = row * this.columns + col;
        if (index >= this.totalTiles) break;

        this.tiles.push({
          index: index,
          row: row,
          col: col,
          x: col * this.tileWidth,
          y: row * this.tileHeight,
          width: this.tileWidth,
          height: this.tileHeight
        });
      }
    }
  }

  // 获取指定索引的瓦片
  getTile(index) {
    return this.tiles[index] || null;
  }

  // 获取指定行列的瓦片
  getTileAt(row, col) {
    const index = row * this.columns + col;
    return this.getTile(index);
  }

  // 绘制指定瓦片
  drawTile(ctx, index, destX, destY, destWidth, destHeight) {
    if (!this.loaded || !this.image) return;

    const tile = this.tiles[index];
    if (!tile) return;

    destWidth = destWidth || this.tileWidth;
    destHeight = destHeight || this.tileHeight;

    ctx.drawImage(
      this.image,
      tile.x, tile.y, tile.width, tile.height,
      destX, destY, destWidth, destHeight
    );
  }

  // 绘制指定行列的瓦片
  drawTileAt(ctx, row, col, destX, destY, destWidth, destHeight) {
    const index = row * this.columns + col;
    this.drawTile(ctx, index, destX, destY, destWidth, destHeight);
  }

  // 渲染（绘制第一个瓦片）
  render(ctx) {
    if (!this.visible || !this.loaded) return;

    // 默认绘制第一个瓦片
    this.drawTile(ctx, 0, this.x, this.y, this.width || this.tileWidth, this.height || this.tileHeight);
  }

  // 设置网格配置
  setGrid(columns, rows, tileWidth, tileHeight) {
    this.columns = columns;
    this.rows = rows;
    this.tileWidth = tileWidth || this.tileWidth;
    this.tileHeight = tileHeight || this.tileHeight;
    this.totalTiles = this.columns * this.rows;

    if (this.image) {
      this._generateTiles();
    }
  }

  // 获取瓦片数量
  getTileCount() {
    return this.tiles.length;
  }

  // 获取所有瓦片
  getAllTiles() {
    return this.tiles;
  }
}

// 导出
export default Tiles;
