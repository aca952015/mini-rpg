// UI Engine - 主入口文件

// 导入内部组件
import { Container } from './layout.js';
import { EventManager, EventType } from './event.js';
import { TweenManager } from './tween.js';
import { ParticleSystem } from './particle.js';
import { NoticeManager } from './notice.js';
import { getPlatform } from '../platform/index.js';

// 导出所有组件
export { BaseComponent } from './base.js';
export { Button } from './button.js';
export { TextBlock } from './textBlock.js';
export { TabView } from './tabView.js';
export { ListView } from './listView.js';
export { ProgressBar } from './progressBar.js';
export { ScrollView } from './scrollView.js';
export { HBox, VBox, Container } from './layout.js';
export { Image, Icon } from './image.js';
export { TreeView, TreeItem } from './treeView.js';
export { Panel, Modal, Dialog } from './panel.js';
export { TablePanel } from './tablePanel.js';
export { Sprite, SpriteAnimation } from './sprite.js';
export { Tiles } from './tiles.js';
export { Viewport, Scene } from './viewport.js';

// 导出事件系统
export { EventType, UIEvent, EventManager, EventEmitter } from './event.js';

// 导出动画系统
export { Easing, Tween, TweenManager } from './tween.js';

// 导出粒子系统
export { Particle, Emitter, ParticleSystem } from './particle.js';

// 导出通知系统
export { NoticeManager, showNotice, getGlobalNoticeManager, setGlobalNoticeManager } from './notice.js';

// 版本信息
export const VERSION = '1.0.0';
export const ENGINE_NAME = 'Mini RPG UI Engine';

// 默认颜色主题
export const DEFAULT_THEME = {
  // 背景色（带透明度）
  bg: 'rgba(26, 20, 18, 0.5)',         // 深棕色
  bgLight: 'rgba(45, 35, 30, 0.5)',    // 中棕色（面板背景）
  bgDark: 'rgba(18, 13, 11, 0.5)',     // 更深

  // 文字色
  text: '#E1E1E1',       // 主文字（亮灰白）
  textSecondary: '#8C7F73', // 次要文字（灰褐色）

  // 强调色
  accent: '#C43A3A',     // 血条/主按钮（暗红）
  accentLight: '#E94560', // 强调红

  // 功能色
  gold: '#CDB089',       // 古铜/金色（战力图标、货币、关卡标题、按钮边框）
  green: '#5FB344',      // 绿色（成功/产出）
  purple: '#A855F7',    // 紫色强调
  pink: '#FF69B4',      // 粉色（系数）

  // 属性色
  attack: '#E94560',     // 攻击/暴击（红）
  defense: '#3B9DFE',    // 防御（蓝）
  dodge: '#5FB344',     // 回避（绿）
  physique: '#00FFE1',   // 根骨（青）
  crit: '#E94560',       // 暴击（红）
  critDamage: '#FFF200', // 爆伤（黄）
  combo: '#6366F1',      // 连击（靛青）
  power: '#CDB089',     // 战力（金色）
  attackSpeed: '#FF69B4', // 攻速（粉）

  // 品质发光色
  qualityGreen: '#5FB344',
  qualityPurple: '#A855F7',
  qualityBlue: '#3B9DFE',

  // 战斗特效
  battleEffect: '#6AE7FB', // 亮蓝色

  // 面板色
  panel: 'rgba(45, 35, 30, 0.95)',
  border: 'rgba(205, 176, 137, 0.3)',

  // 日志
  logTime: '#5A5A5A',   // 日志时间戳
  logHighlight: '#FFD700' // 日志强调（黄）
};

// UIEngine 主类 - 游戏UI核心组件
//
// 功能:
// - 管理所有游戏视图(Viewport)
// - 处理用户输入事件
// - 管理动画系统
// - 统一渲染循环
export class UIEngine {
  constructor(canvas, width, height, options = {}) {

    this.canvas = canvas;
    this.ctx = canvas?.getContext?.('2d') || canvas;
    this.width = width;
    this.height = height;

    // 根容器
    this.root = new Container({
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      backgroundColor: 'transparent'
    });

    // 设置根容器的上下文
    this.root.ctx = this.ctx;
    this.root.canvas = this.canvas;

    // 事件管理器
    this.eventManager = new EventManager();

    // 主题
    this.theme = { ...DEFAULT_THEME };
    this.root.colors = this.theme;

    // 动画系统
    this.tweenManager = new TweenManager();
    this.particleSystem = new ParticleSystem();

    // 通知系统
    this.noticeManager = new NoticeManager();

    // 视图管理
    this.views = {};           // 所有视图 { name: Viewport }
    this.currentView = null;   // 当前显示的视图
    this.currentViewName = ''; // 当前视图名称

    // 交互回调
    this.onInteraction = null; // 点击交互回调 (action) => void

    // 动画帧
    this.lastTime = 0;
    this.running = false;
    this.animationFrameId = null;
    this.platform = options.platform || getPlatform();
    this._eventUnsubscribe = null;

    // 绑定事件（仅在有canvas时）
    if (options.bindEvents !== false && canvas && canvas.addEventListener) {
      this._bindEvents();
    }
  }

  // 注册视图
  registerView(name, view) {
    this.views[name] = view;
    // 如果没有当前视图，默认设为第一个
    if (!this.currentView) {
      this.setCurrentView(name);
    }
    return this;
  }

  // 批量注册视图
  registerViews(viewMap) {
    for (const [name, view] of Object.entries(viewMap)) {
      this.registerView(name, view);
    }
    return this;
  }

  // 设置当前视图
  setCurrentView(name) {
    if (this.views[name]) {
      this.currentViewName = name;
      this.currentView = this.views[name];
      // 设置渲染上下文
      if (this.currentView.setContext) {
        this.currentView.setContext(this.ctx, this.width, this.height);
      }
    }
    return this;
  }

  // 获取当前视图
  getCurrentView() {
    return this.currentView;
  }

  // 获取视图
  getView(name) {
    return this.views[name];
  }

  // 设置渲染上下文（兼容游戏架构）
  setContext(ctx) {
    this.ctx = ctx;
    this.canvas = ctx?.canvas;

    // 更新根容器上下文
    this.root.ctx = ctx;
    this.root.canvas = this.canvas;

    // 同时更新当前视图的上下文
    if (this.currentView && this.currentView.setContext) {
      this.currentView.setContext(ctx);
    }
  }

  // 绑定Canvas事件
  _bindEvents() {
    // 检查是否支持浏览器事件（小游戏环境不支持）
    if (typeof this.canvas.getBoundingClientRect !== 'function') {
      return; // 小游戏环境不需要这些事件
    }

    const subscriptions = [];
    const bind = (type, handler) => {
      this.canvas.addEventListener(type, handler);
      subscriptions.push(() => this.canvas.removeEventListener?.(type, handler));
    };

    // 点击事件
    bind('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this._handleClick(x, y);
    });

    // 鼠标移动事件
    bind('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this._handleMouseMove(x, y);
    });

    // 鼠标按下事件
    bind('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this._handleMouseDown(x, y);
    });

    // 鼠标释放事件
    bind('mouseup', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this._handleMouseUp(x, y);
    });

    // 鼠标离开事件
    bind('mouseleave', () => {
      this._handleMouseLeave();
    });

    this._eventUnsubscribe = () => {
      subscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
      this._eventUnsubscribe = null;
    };
  }

  // 处理点击 - 分发给当前视图
  _handleClick(x, y) {
    // 优先让当前视图处理点击
    if (this.currentView && this.currentView.handleClick) {
      const result = this.currentView.handleClick(x, y);
      if (result) {
        this.eventManager.emit(EventType.CLICK, result);
        // 触发交互回调
        if (this.onInteraction) {
          this.onInteraction(result);
        }
        return;
      }
    }

    // 然后让根容器处理
    const result = this.root.handleClick(x, y);
    if (result) {
      this.eventManager.emit(EventType.CLICK, result);
      if (this.onInteraction) {
        this.onInteraction(result);
      }
    }
  }

  // 处理鼠标移动
  _handleMouseMove(x, y) {
    this.root.handleMouseMove(x, y);
  }

  // 处理鼠标按下
  _handleMouseDown(x, y) {
    const result = this.root.handleMouseDown(x, y);
    if (result) {
      this.eventManager.emit(EventType.MOUSEDOWN, result);
    }
  }

  // 处理鼠标释放
  _handleMouseUp(x, y) {
    const result = this.root.handleMouseUp(x, y);
    if (result) {
      this.eventManager.emit(EventType.MOUSEUP, result);
    }
  }

  _handleMouseCancel() {
    const clearPressedState = (component) => {
      if (!component) return;
      if ('_isPressed' in component) component._isPressed = false;
      if ('_isDragging' in component) component._isDragging = false;
      component.children?.forEach(clearPressedState);
    };

    clearPressedState(this.root);
  }

  // 处理鼠标离开
  _handleMouseLeave() {
    // 清除所有悬停状态
  }

  // 添加根容器子控件
  addChild(child) {
    this.root.addChild(child);
  }

  // 移除根容器子控件
  removeChild(child) {
    this.root.removeChild(child);
  }

  // 开始渲染循环
  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = this.platform.now();
    this._loop();
  }

  // 停止渲染循环
  stop() {
    this.running = false;
    if (this.animationFrameId !== null) {
      this.platform.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // 渲染循环
  _loop() {
    if (!this.running) return;

    const currentTime = this.platform.now();
    const dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // 更新
    this.update(dt);

    // 渲染
    this.render();

    // 请求下一帧
    this.animationFrameId = this.platform.requestAnimationFrame(() => this._loop());
  }

  destroy() {
    this.stop();
    this._eventUnsubscribe?.();
    this.particleSystem.destroy();
  }

  // 更新
  update(dt) {
    const dtMs = dt * 1000;
    this.tweenManager.update(dtMs);
    this.particleSystem.update(dtMs);
    this.noticeManager.update(dtMs);

    // 更新当前视图
    if (this.currentView && this.currentView.update) {
      this.currentView.update(dt);
    }

    this.root.update(dt);
  }

  // 渲染（无数据版本）
  render() {
    // 清空画布
    this.ctx.fillStyle = this.theme.bg;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 渲染粒子
    this.particleSystem.render(this.ctx);

    // 渲染当前视图
    if (this.currentView) {
      this.currentView.render(this.ctx);
    }

    // 渲染根容器
    this.root.render(this.ctx);

    // 渲染通知（在最上层）
    this.noticeManager.render(this.ctx, this.width, this.height);
  }

  // 渲染（带数据版本）- 供游戏调用
  renderWithData(viewData) {
    // 清空画布
    this.ctx.fillStyle = this.theme.bg;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 渲染粒子
    this.particleSystem.render(this.ctx);

    // 渲染当前视图（传入游戏数据）
    // 确保 currentView 及子组件有 ctx
    this._ensureContext(this.currentView);

    try {
      this.currentView.render(viewData);
    } catch (e) {
      console.error('Render error:', e);
    }

    // 渲染根容器
    this.root.render(this.ctx);

    // 渲染通知（在最上层）
    this.noticeManager.render(this.ctx, this.width, this.height);
  }

  // 递归确保所有子组件有 ctx
  _ensureContext(component) {
    if (!component) return;
    // 确保总是有 ctx（即使之前是 null）
    if (this.ctx) {
      component.ctx = this.ctx;
    }
    if (component.children) {
      for (const child of component.children) {
        this._ensureContext(child);
      }
    }
  }

  // 调整尺寸
  resize(width, height) {
    this.width = width;
    this.height = height;
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.root.setSize(width, height);

    // 更新所有视图的尺寸
    for (const view of Object.values(this.views)) {
      if (view.resize) {
        view.resize(width, height);
      }
    }
  }

  // 添加事件监听
  on(type, handler) {
    this.eventManager.on(type, handler);
  }

  // 移除事件监听
  off(type, handler) {
    this.eventManager.off(type, handler);
  }

  // 显示通知（全局）
  notice(text, options = {}) {
    // 传递屏幕尺寸
    const opts = {
      ...options,
      screenWidth: this.width,
      screenHeight: this.height
    };
    this.noticeManager.show(text, opts);
    return this;
  }
}
