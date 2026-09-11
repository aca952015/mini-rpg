// UI Engine - 粒子系统

import { EventEmitter } from './event.js';
import { drawTextWithShadow } from '../rendering/text.js';

// 粒子类
export class Particle extends EventEmitter {
  constructor(options = {}) {
    super();

    // 位置
    this.x = options.x || 0;
    this.y = options.y || 0;

    // 速度
    this.vx = options.vx || 0;
    this.vy = options.vy || 0;

    // 加速度
    this.ax = options.ax || 0;
    this.ay = options.ay || 0;

    // 尺寸
    this.width = options.width || 10;
    this.height = options.height || 10;
    this.size = options.size || 10;
    this.startSize = options.startSize || this.size;
    this.endSize = options.endSize || this.size;

    // 颜色
    this.color = options.color || '#ffffff';
    this.startColor = options.startColor || this.color;
    this.endColor = options.endColor || this.color;

    // 透明度
    this.alpha = options.alpha !== undefined ? options.alpha : 1;
    this.startAlpha = options.startAlpha !== undefined ? options.startAlpha : 1;
    this.endAlpha = options.endAlpha !== undefined ? options.endAlpha : 0;

    // 旋转
    this.rotation = options.rotation || 0;
    this.rotationSpeed = options.rotationSpeed || 0;

    // 生命周期
    this.life = options.life || 1000; // 毫秒
    this.maxLife = this.life;
    this.age = 0;

    // 物理属性
    this.gravity = options.gravity || 0;
    this.friction = options.friction !== undefined ? options.friction : 1;

    // 混合模式
    this.blendMode = options.blendMode || 'source-over';

    // 纹理/图片
    this.image = options.image || null;

    // 文本（用于文字粒子）
    this.text = options.text || '';

    // 激活状态
    this.active = true;
  }

  // 更新
  update(dt) {
    if (!this.active) return false;

    // 更新年龄
    this.age += dt;

    // 检查生命周期
    if (this.age >= this.life) {
      this.active = false;
      this.emit('dead');
      return false;
    }

    // 计算生命周期进度 (0-1)
    const progress = this.age / this.life;

    // 应用加速度
    this.vx += this.ax * dt / 1000;
    this.vy += this.ay * dt / 1000;

    // 应用重力
    this.vy += this.gravity * dt / 1000;

    // 应用摩擦力
    this.vx *= this.friction;
    this.vy *= this.friction;

    // 更新位置
    this.x += this.vx * dt / 1000;
    this.y += this.vy * dt / 1000;

    // 更新旋转
    this.rotation += this.rotationSpeed * dt / 1000;

    // 插值尺寸
    this.size = this.startSize + (this.endSize - this.startSize) * progress;

    // 插值颜色
    this.color = this._lerpColor(this.startColor, this.endColor, progress);

    // 插值透明度
    this.alpha = this.startAlpha + (this.endAlpha - this.startAlpha) * progress;

    return true;
  }

  // 颜色插值
  _lerpColor(color1, color2, t) {
    const c1 = this._parseColor(color1);
    const c2 = this._parseColor(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  // 解析颜色
  _parseColor(color) {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      return {
        r: parseInt(hex.substr(0, 2), 16),
        g: parseInt(hex.substr(2, 2), 16),
        b: parseInt(hex.substr(4, 2), 16)
      };
    }
    // 假设 rgb/rgba 格式
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    return { r: 255, g: 255, b: 255 };
  }

  // 渲染
  render(ctx) {
    if (!this.active || this.alpha <= 0) return;

    ctx.save();

    // 设置混合模式
    ctx.globalAlpha = this.alpha;
    ctx.globalCompositeOperation = this.blendMode;

    // 移动到粒子位置
    ctx.translate(this.x, this.y);

    // 旋转
    if (this.rotation !== 0) {
      ctx.rotate(this.rotation * Math.PI / 180);
    }

    // 绘制
    if (this.image) {
      // 绘制图片
      const halfSize = this.size / 2;
      ctx.drawImage(this.image, -halfSize, -halfSize, this.size, this.size);
    } else if (this.text) {
      // 绘制文字
      ctx.font = `${this.size}px sans-serif`;
      ctx.fillStyle = this.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      drawTextWithShadow(ctx, this.text, 0, 0, { inheritContext: true });
    } else {
      // 绘制矩形
      ctx.fillStyle = this.color;
      const halfWidth = (this.width || this.size) / 2;
      const halfHeight = (this.height || this.size) / 2;
      ctx.fillRect(-halfWidth, -halfHeight, this.width || this.size, this.height || this.size);
    }

    ctx.restore();
  }

  // 重置
  reset(options = {}) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.vx = options.vx || 0;
    this.vy = options.vy || 0;
    this.ax = options.ax || 0;
    this.ay = options.ay || 0;
    this.size = options.size || this.startSize;
    this.startSize = options.startSize || this.size;
    this.endSize = options.endSize || this.size;
    this.color = options.color || '#ffffff';
    this.startColor = options.startColor || this.color;
    this.endColor = options.endColor || this.color;
    this.alpha = options.alpha !== undefined ? options.alpha : 1;
    this.startAlpha = options.startAlpha !== undefined ? options.startAlpha : 1;
    this.endAlpha = options.endAlpha !== undefined ? options.endAlpha : 0;
    this.rotation = options.rotation || 0;
    this.rotationSpeed = options.rotationSpeed || 0;
    this.life = options.life || 1000;
    this.maxLife = this.life;
    this.gravity = options.gravity || 0;
    this.friction = options.friction !== undefined ? options.friction : 1;
    this.age = 0;
    this.active = true;
  }
}

// 粒子发射器
export class Emitter extends EventEmitter {
  constructor(options = {}) {
    super();

    this.x = options.x || 0;
    this.y = options.y || 0;

    // 发射配置
    this.emissionRate = options.emissionRate || 10; // 每秒发射数量
    this.emissionInterval = 1000 / this.emissionRate;
    this.lastEmissionTime = 0;
    this.particleCount = options.particleCount || 100; // 最大粒子数
    this.autoEmit = options.autoEmit !== false;

    // 粒子生命周期
    this.minLife = options.minLife || 500;
    this.maxLife = options.maxLife || 1000;

    // 粒子尺寸
    this.minSize = options.minSize || 5;
    this.maxSize = options.maxSize || 10;

    // 粒子速度
    this.minSpeed = options.minSpeed || 50;
    this.maxSpeed = options.maxSpeed || 100;
    this.speedAngle = options.speedAngle || 0; // 速度角度 (弧度)
    this.speedAngleRange = options.speedAngleRange || Math.PI * 2; // 角度范围

    // 粒子颜色
    this.colors = options.colors || ['#ffffff'];
    this.startColors = options.startColors || this.colors;
    this.endColors = options.endColors || ['#ffffff'];

    // 粒子透明度
    this.startAlpha = options.startAlpha !== undefined ? options.startAlpha : 1;
    this.endAlpha = options.endAlpha !== undefined ? options.endAlpha : 0;

    // 重力
    this.gravity = options.gravity || 0;

    // 摩擦力
    this.friction = options.friction !== undefined ? options.friction : 1;

    // 旋转速度
    this.minRotationSpeed = options.minRotationSpeed || 0;
    this.maxRotationSpeed = options.maxRotationSpeed || 0;

    // 粒子池
    this.particles = [];
    this.pool = [];

    // 激活状态
    this.active = this.autoEmit;
    this._activeBeforePause = null;
  }

  // 发射粒子
  emit() {
    if (!this.active || this.particles.length >= this.particleCount) return;

    const particle = this._createParticle();
    this.particles.push(particle);
    super.emit('particleCreated', particle);
  }

  // 创建粒子
  _createParticle() {
    // 从池中获取或创建新粒子
    let particle = this.pool.pop();
    if (!particle) {
      particle = new Particle();
    }

    // 随机参数
    const angle = this.speedAngle + (Math.random() - 0.5) * this.speedAngleRange;
    const speed = this._random(this.minSpeed, this.maxSpeed);
    const life = this._random(this.minLife, this.maxLife);
    const size = this._random(this.minSize, this.maxSize);
    const startColor = this.startColors[Math.floor(Math.random() * this.startColors.length)];
    const endColor = this.endColors[Math.floor(Math.random() * this.endColors.length)];

    particle.reset({
      x: this.x,
      y: this.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      startSize: size,
      endSize: size * 0.5,
      startColor: startColor,
      endColor: endColor,
      startAlpha: this.startAlpha,
      endAlpha: this.endAlpha,
      life: life,
      gravity: this.gravity,
      friction: this.friction,
      rotationSpeed: this._random(this.minRotationSpeed, this.maxRotationSpeed)
    });

    return particle;
  }

  // 随机数
  _random(min, max) {
    return min + Math.random() * (max - min);
  }

  // 更新
  update(dt) {
    // 自动发射
    if (this.active && this.autoEmit) {
      this.lastEmissionTime += dt;
      while (this.lastEmissionTime >= this.emissionInterval) {
        this.emit();
        this.lastEmissionTime -= this.emissionInterval;
      }
    }

    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      const alive = particle.update(dt);

      if (!alive) {
        // 回收粒子到池中
        this.pool.push(particle);
        this.particles.splice(i, 1);
        super.emit('particleDead', particle);
      }
    }
  }

  // 渲染
  render(ctx) {
    for (const particle of this.particles) {
      particle.render(ctx);
    }
  }

  // 激活
  start() {
    this.active = true;
    this._activeBeforePause = null;
    super.emit('start');
  }

  // 停止
  stop() {
    this.active = false;
    this._activeBeforePause = null;
    super.emit('stop');
  }

  // 暂停
  pause() {
    if (this._activeBeforePause === null) {
      this._activeBeforePause = this.active;
    }
    this.active = false;
    super.emit('pause');
  }

  // 恢复
  resume() {
    this.active = this._activeBeforePause === null ? true : this._activeBeforePause;
    this._activeBeforePause = null;
    super.emit('resume');
  }

  // 清空粒子
  clear() {
    for (const particle of this.particles) {
      this.pool.push(particle);
    }
    this.particles = [];
  }

  // 设置位置
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  // 设置颜色
  setColors(colors) {
    this.colors = colors;
    this.startColors = colors;
    this.endColors = colors;
  }
}

// 粒子系统管理器
export class ParticleSystem {
  constructor() {
    this.emitters = [];
  }

  // 添加发射器
  addEmitter(emitter) {
    this.emitters.push(emitter);
    return emitter;
  }

  // 移除发射器
  removeEmitter(emitter) {
    const index = this.emitters.indexOf(emitter);
    if (index !== -1) {
      this.emitters.splice(index, 1);
    }
  }

  // 创建并添加发射器
  createEmitter(options) {
    const emitter = new Emitter(options);
    this.emitters.push(emitter);
    return emitter;
  }

  // 快捷方法：爆炸效果
  explode(x, y, options = {}) {
    const count = options.count ?? 30;
    const emitter = new Emitter({
      x,
      y,
      particleCount: count,
      emissionRate: count,
      autoEmit: false,
      minLife: options.minLife || 300,
      maxLife: options.maxLife || 600,
      minSize: options.minSize || 3,
      maxSize: options.maxSize || 8,
      minSpeed: options.speed || 100,
      maxSpeed: (options.speed || 100) * 2,
      speedAngleRange: Math.PI * 2,
      colors: options.colors || ['#ffcc00', '#ff6600', '#ff0000'],
      startColors: options.colors || ['#ffcc00', '#ff6600', '#ff0000'],
      endColors: ['#ff0000', '#660000', '#330000'],
      startAlpha: 1,
      endAlpha: 0,
      gravity: options.gravity || 200,
      friction: 0.95
    });

    emitter.start();
    this.emitters.push(emitter);
    for (let index = 0; index < count; index++) {
      emitter.emit();
    }
    emitter.stop();

    return emitter;
  }

  // 快捷方法：喷射效果
  spray(x, y, options = {}) {
    const emitter = new Emitter({
      x,
      y,
      particleCount: options.count || 50,
      emissionRate: options.rate || 50,
      minLife: options.minLife || 500,
      maxLife: options.maxLife || 1000,
      minSize: options.minSize || 2,
      maxSize: options.maxSize || 5,
      minSpeed: options.speed || 50,
      maxSpeed: (options.speed || 50) * 2,
      speedAngle: options.angle || -Math.PI / 2,
      speedAngleRange: options.angleRange || Math.PI / 4,
      colors: options.colors || ['#ffffff', '#aaaaaa'],
      startColors: options.colors || ['#ffffff', '#aaaaaa'],
      endColors: ['#ffffff', '#444444'],
      startAlpha: 0.8,
      endAlpha: 0,
      gravity: options.gravity || 50
    });

    emitter.start();
    this.emitters.push(emitter);

    return emitter;
  }

  // 快捷方法：火焰效果
  fire(x, y, options = {}) {
    return this.spray(x, y, {
      count: options.count || 30,
      rate: options.rate || 30,
      minLife: 300,
      maxLife: 800,
      minSize: 5,
      maxSize: 15,
      speed: 30,
      speedAngle: -Math.PI / 2,
      speedAngleRange: Math.PI / 3,
      colors: ['#ffff00', '#ff8800', '#ff4400', '#ff0000'],
      startColors: ['#ffff00', '#ffaa00', '#ff8800'],
      endColors: ['#ff4400', '#ff0000', '#880000'],
      startAlpha: 1,
      endAlpha: 0,
      gravity: -20
    });
  }

  // 快捷方法：烟雾效果
  smoke(x, y, options = {}) {
    return this.spray(x, y, {
      count: options.count || 20,
      rate: options.rate || 20,
      minLife: 800,
      maxLife: 1500,
      minSize: 10,
      maxSize: 30,
      speed: 20,
      speedAngle: -Math.PI / 2,
      speedAngleRange: Math.PI / 4,
      colors: ['#666666', '#ffffff', '#aaaaaa'],
      startColors: ['#ffffff', '#aaaaaa', '#cccccc'],
      endColors: ['#333333', '#555555', '#777777'],
      startAlpha: 0.5,
      endAlpha: 0,
      gravity: -10
    });
  }

  // 更新所有发射器
  update(dt) {
    for (const emitter of this.emitters) {
      emitter.update(dt);
    }

    // 清理空发射器
    this.emitters = this.emitters.filter(e => e.particles.length > 0 || e.active);
  }

  // 渲染所有粒子
  render(ctx) {
    for (const emitter of this.emitters) {
      emitter.render(ctx);
    }
  }

  // 清空所有
  clear() {
    for (const emitter of this.emitters) {
      emitter.clear();
    }
    this.emitters = [];
  }

  destroy() {
    this.clear();
  }

  // 暂停所有
  pause() {
    for (const emitter of this.emitters) {
      emitter.pause();
    }
  }

  // 恢复所有
  resume() {
    for (const emitter of this.emitters) {
      emitter.resume();
    }
  }
}
