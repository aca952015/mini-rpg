# mini-mmo 引擎移植计划

## 来源与范围

- 来源：`/Users/aca/dev/minigames/mini-mmo/src/engine/**`
- 目标：`src/engine/**`
- 从 `mini-mmo/src/utils.js` 只提取中立的 `drawTextWithShadow` 到 `src/rendering/text.js`
- 引擎内所有文本绘制改为引用 `../rendering/text.js`
- 不引入业务数据、武侠系统或新依赖

## 移植前行为约束

先用 `node:test` 固定以下行为，再修复源实现中的已知问题：

1. `Emitter.emit()` 每次只创建一个粒子，并通过 `super.emit()` 派发粒子生命周期事件。
2. `Sprite.update(dt)` 使用游戏循环传入的秒制 `dt`，不读取墙钟时间。
3. `Tween.to()` / `Tween.from()` 保持可调用，yoyo 会从终点平滑返回起点。
4. `Container` 与 `Viewport` 能识别直接传入的 Canvas 2D 绘图上下文。
5. `UIEngine.render()` 先清屏、再绘制当前视图和根控件；透明根容器不会覆盖视图。
6. 爆炸粒子是一次性 burst，生命周期只由 `ParticleSystem.update(dtMilliseconds)` 推进，不创建墙钟定时器。
7. 竖向 `ProgressBar` 按当前百分比从底部向上填充。

## 接口约定

- `UIEngine.update(dtSeconds)`、`Viewport.update(dtSeconds)`、`Sprite.update(dtSeconds)` 接收秒。
- `TweenManager.update(dtMilliseconds)`、`ParticleSystem.update(dtMilliseconds)`、`NoticeManager.update(dtMilliseconds)` 接收毫秒；`UIEngine` 负责转换。
- `UIEngine.render()` 直接使用构造时传入的 canvas 或 2D context。
- 平台能力统一从 `src/platform/index.js` 的 `getPlatform()` 获取。

## 触摸滚动边界

- 输入层支持从根浮层或当前 `Viewport` 中命中 `ListView`、`ScrollView`，并处理常见的 `Container` 嵌套坐标。
- 根浮层中的滚动控件优先于当前视图。
- 当前未覆盖 `Panel`、`TabView` 等具有自定义内部坐标变换的复杂组合控件；接入这类控件时应补对应命中测试。
