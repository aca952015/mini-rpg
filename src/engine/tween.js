// UI Engine - 补间动画系统

import { EventEmitter } from './event.js';

// 缓动函数
export const Easing = {
  // 线性
  linear: (t) => t,

  // 二次缓动
  quadIn: (t) => t * t,
  quadOut: (t) => t * (2 - t),
  quadInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  // 三次缓动
  cubicIn: (t) => t * t * t,
  cubicOut: (t) => (--t) * t * t + 1,
  cubicInOut: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  // 四次缓动
  quartIn: (t) => t * t * t * t,
  quartOut: (t) => 1 - (--t) * t * t * t,
  quartInOut: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

  // 五次缓动
  quintIn: (t) => t * t * t * t * t,
  quintOut: (t) => 1 + (--t) * t * t * t * t,
  quintInOut: (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,

  // 正弦缓动
  sineIn: (t) => 1 - Math.cos(t * Math.PI / 2),
  sineOut: (t) => Math.sin(t * Math.PI / 2),
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // 指数缓动
  expoIn: (t) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  expoOut: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  expoInOut: (t) => {
    if (t === 0 || t === 1) return t;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },

  // 圆缓动
  circIn: (t) => 1 - Math.sqrt(1 - t * t),
  circOut: (t) => Math.sqrt(1 - (--t) * t),
  circInOut: (t) => {
    if (t < 0.5) return (1 - Math.sqrt(1 - 4 * t * t)) / 2;
    return (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2;
  },

  // 回退缓动
  backIn: (t) => {
    const c1 = 1.70158;
    return c1 * t * t * t - c1 * t * t;
  },
  backOut: (t) => {
    const c1 = 1.70158;
    return 1 + c1 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  backInOut: (t) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    if (t < 0.5) return (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2;
    return (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },

  // 弹性缓动
  elasticIn: (t) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
  },
  elasticOut: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  elasticInOut: (t) => {
    if (t === 0 || t === 1) return t;
    if (t < 0.5) {
      return -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2;
    }
    return (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2 + 1;
  },

  // 弹跳缓动
  bounceIn: (t) => 1 - Easing.bounceOut(1 - t),
  bounceOut: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
  bounceInOut: (t) => {
    if (t < 0.5) return (1 - Easing.bounceOut(1 - 2 * t)) / 2;
    return (1 + Easing.bounceOut(2 * t - 1)) / 2;
  }
};

// 补间动画类
export class Tween extends EventEmitter {
  constructor(target, options = {}) {
    super();

    this.target = target;
    this.duration = options.duration || 1000; // 毫秒
    this.easing = options.easing || Easing.linear;
    this.delay = options.delay || 0;
    this.repeat = options.repeat || 0;
    this.yoyo = options.yoyo || false;

    this._fromValues = { ...(options.from || {}) };
    this._toValues = { ...(options.to || {}) };

    this.startTime = null;
    this.elapsed = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.currentRepeat = 0;
    this.direction = 1; // 1: forward, -1: backward

    // 动画开始时的目标状态快照
    this.startValues = {};
    this._captureStartValues();
  }

  // 捕获起始值
  _captureStartValues() {
    for (const key in this._toValues) {
      if (this._fromValues[key] === undefined) {
        this.startValues[key] = this.target[key];
      } else {
        this.startValues[key] = this._fromValues[key];
      }
    }
  }

  // 设置起始值
  _setStartValues() {
    for (const key in this.startValues) {
      this.target[key] = this.startValues[key];
    }
  }

  // 更新
  update(deltaTime) {
    if (!this.isPlaying || this.isPaused) return;

    this.elapsed += deltaTime;

    // 延迟时间
    if (this.elapsed < this.delay) return;

    const progress = Math.min(1, (this.elapsed - this.delay) / this.duration);
    const easedProgress = this.easing(progress);
    const directedProgress = this.direction === 1 ? easedProgress : 1 - easedProgress;

    // 应用缓动后的值
    for (const key in this._toValues) {
      const start = this.startValues[key];
      const end = this._toValues[key];
      this.target[key] = start + (end - start) * directedProgress;
    }

    // 发送进度事件
    this.emit('update', {
      progress,
      easedProgress,
      direction: this.direction,
      target: this.target
    });

    // 动画完成
    if (progress >= 1) {
      this._onComplete();
    }
  }

  // 动画完成回调
  _onComplete() {
    // 是否需要反转
    if (this.yoyo && this.direction === 1) {
      this.direction = -1;
      this.elapsed = 0;
      return;
    }

    // 是否需要重复
    if (this.currentRepeat < this.repeat) {
      this.currentRepeat++;
      this.elapsed = 0;
      this.direction = 1;
      this._captureStartValues();
      this._setStartValues();
      return;
    }

    this.isPlaying = false;
    this.emit('complete', { target: this.target });
  }

  // 播放
  play() {
    this.isPlaying = true;
    this.isPaused = false;
    this.direction = 1;
    this.emit('play');
    return this;
  }

  // 暂停
  pause() {
    this.isPaused = true;
    this.emit('pause');
    return this;
  }

  // 恢复
  resume() {
    this.isPaused = false;
    this.emit('resume');
    return this;
  }

  // 停止
  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.emit('stop');
    return this;
  }

  // 重置
  reset() {
    this.elapsed = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.currentRepeat = 0;
    this.direction = 1;
    this._captureStartValues();
    this._setStartValues();
    return this;
  }

  // 设置结束值
  to(properties, duration) {
    this._toValues = { ...this._toValues, ...properties };
    if (duration !== undefined) {
      this.duration = duration;
    }
    this._captureStartValues();
    return this;
  }

  // 设置起始值
  from(properties) {
    this._fromValues = { ...this._fromValues, ...properties };
    this._captureStartValues();
    return this;
  }
}

// 补间动画管理器
export class TweenManager {
  constructor() {
    this.tweens = [];
    this.paused = false;
  }

  // 创建补间动画
  create(target, options) {
    const tween = new Tween(target, options);
    this.tweens.push(tween);
    return tween;
  }

  // 快捷方法：动画到指定值
  to(target, toValues, duration, easing) {
    return this.create(target, {
      to: toValues,
      duration,
      easing
    }).play();
  }

  // 从指定值开始动画
  from(target, fromValues, toValues, duration, easing) {
    return this.create(target, {
      from: fromValues,
      to: toValues,
      duration,
      easing
    }).play();
  }

  // 更新所有补间动画
  update(deltaTime) {
    if (this.paused) return;

    // 倒序遍历以便安全删除
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tween = this.tweens[i];
      tween.update(deltaTime);

      // 移除已完成的补间动画
      if (!tween.isPlaying && tween.elapsed >= tween.delay + tween.duration) {
        this.tweens.splice(i, 1);
      }
    }
  }

  // 暂停所有
  pauseAll() {
    this.paused = true;
    this.tweens.forEach(t => t.pause());
  }

  // 恢复所有
  resumeAll() {
    this.paused = false;
    this.tweens.forEach(t => t.resume());
  }

  // 停止所有
  stopAll() {
    this.tweens.forEach(t => t.stop());
    this.tweens = [];
  }

  // 获取指定目标的补间动画
  getTweensForTarget(target) {
    return this.tweens.filter(t => t.target === target);
  }

  // 停止指定目标的补间动画
  stopTweensForTarget(target) {
    this.tweens = this.tweens.filter(t => {
      if (t.target === target) {
        t.stop();
        return false;
      }
      return true;
    });
  }
}
