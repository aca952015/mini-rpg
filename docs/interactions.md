# 游戏交互基础设施

## 提取来源

基于 mini-mmo 提交 `bee553b` 的本地实现：`src/ui.js` 的 UIManager、`src/ui/mainView.js` 的覆盖面板注册与输入阻断、`src/game/actionRouter.js` 的两种动作格式与统一执行、`src/engine/event.js` 的事件管理。

mini-rpg 保留这些职责和协议，将多个弹层布尔变量与单活动覆盖面板整理为一个后进先出的模态栈。武侠页面、人物属性、装备和地图动作未复制。

## 交互链路与分工

平台触点由 InputController 接收。控件只返回 action，UIManager.onInteraction 将它交给 Game.handleAction，ActionRouter 调用唯一的处理函数。业务修改成功后发布领域事件，画面由下一帧数据刷新。

动作是请求，事件是已发生的事实。用 `actions.register()` 执行升级、存档等状态变更；用 `events.on()` 订阅进度、导航和弹窗通知。不要同时在按钮 click 监听与动作处理器中执行同一次升级。

| 文件 | 职责 |
| --- | --- |
| `src/ui.js` | 页面、返回历史、底部导航、安全区、模态栈、绘制顺序 |
| `src/core/input.js` | 点击/拖动互斥、当前输入层、手势取消与页面变化保护 |
| `src/core/actionRouter.js` | 动作标准化、单处理器路由、同步/异步结果、注销 |
| `src/core/actionTypes.js` | 通用 UI 动作与事件名称 |
| `src/engine/event.js` | 多订阅者广播、一次性监听、取消订阅 |
| `src/game/actionTypes.js` | 本游戏动作与领域事件名称 |
| `src/main.js` | 连接 UI、路由与事件；执行业务与持久化 |

## 接入动作和事件

在游戏动作常量中添加类型，在 Game 或领域控制器中注册处理器；UI 用 Button 的 `setAction(type, payload)` 返回请求：

```js
const unregister = game.actions.register('training:setMode', ({ mode }) => {
  training.setMode(mode);
  game.events.emit('training:modeChanged', { mode });
});
button.setAction('training:setMode', { mode: 'single' });
const unsubscribe = game.events.on('training:modeChanged', ({ mode }) => view.setMode(mode));

// 控制器或页面退出时释放自己拥有的注册。
unsubscribe();
unregister();
```

推荐输入为 `{ type: 'training:setMode', mode: 'single' }`。旧格式 `{ action: 'training:setMode', data: { mode: 'single' } }` 仍受支持。内部标准化为 `{ type, data }`，处理器签名为 `handler(data, action)`。标准化对象供处理器读取，不要再次传给 `dispatch()`；它不是 UI 输入格式。

扁平 action 中的 `data` 是普通业务字段，会保留嵌套，例如 `{ type: 'openModal', name: 'detail', data: { itemId: 7 } }` 不会丢失 `name`。标准化不会修改输入，但不做深拷贝，处理器应把参数视为只读。

每个动作类型只能有一个处理器，重复注册抛错。`dispatch()` 同步返回 `{ status, action, result?, error? }`；异步处理器返回 Promise。状态为 `handled`、`unhandled`、`invalid`、`error`。`handled` 表示处理器正常结束，业务结果仍需读取 `result`，例如无可返回页面时为 `false`。

对应通知为 `action:handled`、`action:unhandled`、`action:error`。无效输入直接返回 `invalid`。事件监听器同步执行，异常向调用方传播；订阅者应处理自己发起的可失败操作。路由不回滚已完成的副作用，也不自动去重两个独立动作。

## 页面与公共导航

页面继承 Viewport，由应用注册实例：

```js
ui.registerView('training', new TrainingView());
ui.registerView('progress', new ProgressView());
ui.setNavigation([{ view: 'training', text: '训练' }, { view: 'progress', text: '成长' }]);
game.handleAction({ type: UI_ACTIONS.SWITCH_VIEW, view: 'progress', params: { tab: 'stats' } });
game.handleAction({ type: UI_ACTIONS.BACK });
```

UI_ACTIONS 从 `src/core/actionTypes.js` 导入，包含 SWITCH_VIEW、BACK、OPEN_MODAL、CLOSE_MODAL、NOTICE、REFRESH。`ui.bindActions(router)` 注册这些处理器；Game 初始化时已调用。

首个页面默认进入，重复选择不重复调用生命周期。页面可实现 `onEnter(params)`、`onExit()`、`destroy()`、`layout(width, height, safeArea)` 和 `setData(viewData)`。退出时释放本次进入的订阅，销毁时释放实例资源。返回历史保留进入参数；切换页面先关闭全部模态。传入 `replace: true` 可不新增历史。

有导航时页面安全区 bottom 已包含 64 像素导航空间。应用只驱动 `ui.update(dtSeconds)` 和 `ui.render(viewData)`；setData 接收只读展示数据，renderContent(ctx) 绘制。不要使用旧 renderWithData 通道绕过模态层。

## 模态与输入

模态使用工厂，每次关闭后销毁。建议内容继承 Container，在 layout 中设置面板位置和尺寸，完整屏幕遮罩由 UIManager 绘制：

```js
ui.registerModal('detail', (data) => new DetailPanel(data));
game.handleAction({ type: UI_ACTIONS.OPEN_MODAL, name: 'detail', data: { itemId: 7 } });
game.handleAction({ type: UI_ACTIONS.CLOSE_MODAL, name: 'detail' });
```

- 顶层模态独占点击、拖动与悬停，空白区域不向页面或导航透传。关闭必须移出模态栈，仅隐藏内容不会解除阻断。
- 默认点击遮罩不关闭；打开动作可传 `closeOnBackdrop: true`。
- 只允许关闭栈顶；重复打开已在栈内的同名模态无效果。back 优先关模态，再返回页面。
- 页面切换、模态变化、尺寸变化使旧手势失效，抬手不能点击新露出的页面。
- 标准按钮和列表项须在同一目标内按下、抬手；轻微跨到相邻按钮或从弹窗内部滑到遮罩均不触发。自定义页面内部多个交互区应使用独立子控件，才能获得目标级保护。
- 支持 Viewport、Container、ScrollView content 内的 ListView/ScrollView 拖动。旧 Panel/Modal/TabView 特殊内部坐标需另行适配。

绘制顺序：背景/粒子 → 当前页面 → 公共导航 → 模态栈 → 通知。页面和打开的模态每帧更新一次；模态不会暂停玩法时间。

## 生命周期与验证

on、once、register 返回幂等注销函数。once 在回调前移除，重入或异常不会再次执行。派发期间新增监听在下一次生效，被删除的待执行监听会跳过。

UIManager 销毁页面、模态、动画、内部事件和 UI 路由。Game 销毁输入、业务路由及共享事件。注入的事件管理器由注入方清理；路由自建的事件管理器由路由销毁。

异步动作在路由销毁后完成时返回 invalid，不再广播。已经启动的 Promise 和业务副作用不能自动取消；后续网络、广告等系统须自行实现取消或实例有效性校验。

运行 `npm run verify` 检查全部模块、依赖边界与回归。手工路径：训练页升级 → 成长页 → 打开确认 → 尝试点击导航（应阻断）→ 确认升级 → 返回训练 → 重启恢复进度。抖音开发者工具和真机仍需检查安全区、触摸与前后台切换；当前仅完成自动化模拟验证。
