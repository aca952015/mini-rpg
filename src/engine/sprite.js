// UI Engine - 精灵组件

import { BaseComponent } from './base.js';
import { getPlatform } from '../platform/index.js';

export class Sprite extends BaseComponent {
  constructor(options = {}) {
    super(options);

    // 精灵数据
    this.frames = options.frames || []; // 帧数组，每帧 {x, y, width, height}
    this.currentFrame = 0;
    this.frameTime = options.frameTime || 100; // 每帧时间(ms)
    this.frameElapsed = 0;

    // 播放控制
    this.playing = options.playing !== false;
    this.loop = options.loop !== false;
    this.playingBackward = false;

    // 图片源
    this.image = null;
    this.imageSrc = options.imageSrc || '';
    this.spriteSheet = options.spriteSheet || null;

    // 缩放
    this.scaleX = options.scaleX || 1;
    this.scaleY = options.scaleY || 1;

    // 旋转
    this.rotation = options.rotation || 0;
    this.rotationCenter = options.rotationCenter || { x: 0.5, y: 0.5 }; // 0.5 表示中心

    // 镜像
    this.flipX = options.flipX || false;
    this.flipY = options.flipY || false;

    // 加载图片
    if (this.imageSrc) {
      this._loadImage();
    } else if (this.spriteSheet) {
      this.frames = this.spriteSheet.frames || [];
      this.frameWidth = this.spriteSheet.frameWidth;
      this.frameHeight = this.spriteSheet.frameHeight;
      this._loadImage(this.spriteSheet.imageSrc);
    }
  }

  // 加载图片
  _loadImage(src) {
    this.image = getPlatform().createImage();
    this.image.onload = () => {
      this.loaded = true;
      this.dispatchEvent('load');
    };
    this.image.src = src || this.imageSrc;
  }

  // 渲染
  render(ctx) {
    if (!this.visible) return;

    ctx.save();

    // 应用变换
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

    // 旋转
    if (this.rotation !== 0) {
      ctx.rotate(this.rotation * Math.PI / 180);
    }

    // 缩放
    ctx.scale(this.scaleX * (this.flipX ? -1 : 1), this.scaleY * (this.flipY ? -1 : 1));

    // 绘制当前帧
    if (this.image && this.loaded && this.frames.length > 0) {
      const frame = this.frames[this.currentFrame];
      if (frame) {
        ctx.drawImage(
          this.image,
          frame.x, frame.y, frame.width, frame.height,
          -this.width / 2, -this.height / 2,
          this.width, this.height
        );
      }
    }

    ctx.restore();
  }

  // 更新动画
  update(dt) {
    if (!this.playing || this.frames.length <= 1) return;

    this.frameElapsed += dt;
    const frameDuration = this.frameTime / 1000;
    while (this.playing && this.frameElapsed >= frameDuration) {
      this.nextFrame();
      this.frameElapsed -= frameDuration;
    }
  }

  // 下一帧
  nextFrame() {
    if (this.playingBackward) {
      this.currentFrame--;
      if (this.currentFrame < 0) {
        if (this.loop) {
          this.currentFrame = this.frames.length - 1;
        } else {
          this.currentFrame = 0;
          this.playing = false;
          this.dispatchEvent('complete');
        }
      }
    } else {
      this.currentFrame++;
      if (this.currentFrame >= this.frames.length) {
        if (this.loop) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = this.frames.length - 1;
          this.playing = false;
          this.dispatchEvent('complete');
        }
      }
    }
  }

  // 播放
  play() {
    this.playing = true;
    this.frameElapsed = 0;
  }

  // 暂停
  pause() {
    this.playing = false;
  }

  // 停止
  stop() {
    this.playing = false;
    this.currentFrame = 0;
    this.frameElapsed = 0;
  }

  // 跳到指定帧
  gotoFrame(frame) {
    this.currentFrame = Math.max(0, Math.min(frame, this.frames.length - 1));
  }

  // 播放倒放
  playBackward() {
    this.playingBackward = true;
    this.play();
  }

  // 设置帧率
  setFrameRate(fps) {
    this.frameTime = 1000 / fps;
  }

  // 设置循环
  setLoop(loop) {
    this.loop = loop;
  }
}

// 序列帧动画精灵（简化版）
export class SpriteAnimation extends Sprite {
  constructor(options = {}) {
    super(options);

    this.frameCount = options.frameCount || 1;
    this.columns = options.columns || 1; // 精灵图列数
    this.frameIndex = 0;
    this.totalFrames = options.totalFrames || this.frameCount;

    // 从精灵图生成帧
    if (this.spriteSheet && this.frameWidth && this.frameHeight) {
      this._generateFrames();
    }
  }

  // 生成帧数据
  _generateFrames() {
    this.frames = [];
    const rows = Math.ceil(this.totalFrames / this.columns);

    for (let i = 0; i < this.totalFrames; i++) {
      const row = Math.floor(i / this.columns);
      const col = i % this.columns;
      this.frames.push({
        x: col * this.frameWidth,
        y: row * this.frameHeight,
        width: this.frameWidth,
        height: this.frameHeight
      });
    }
  }

  // 设置精灵图配置
  setSpriteSheet(imageSrc, frameWidth, frameHeight, totalFrames, columns) {
    this.imageSrc = imageSrc;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.totalFrames = totalFrames;
    this.columns = columns || 1;

    this.width = frameWidth;
    this.height = frameHeight;

    this._generateFrames();
    this._loadImage(imageSrc);
  }
}
