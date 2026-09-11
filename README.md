# mini-rpg

抖音竖屏射箭成长小游戏。当前已移植 mini-mmo 的平台适配和自研 Canvas 2D UI 引擎，提供按钮、进度条、特效及本地存档的基础功能示例，尚未接入正式战斗。

## 运行

- 抖音：在抖音开发者工具中打开本目录并编译，保留原工程 App ID 与竖屏配置。
- 浏览器：在本目录运行 `python3 -m http.server 8000 --bind 127.0.0.1`，打开 `http://127.0.0.1:8000`。不支持直接用 file:// 打开。
- 检查：使用 Node.js 22 或更新版本运行 `npm run verify`。
- 单独测试：`npm test`。

不需要安装 npm 依赖，没有打包器或额外编译步骤。`package.json` 只声明 ES Modules 和本地检查脚本。

## 目录

- `src/platform/`：抖音与浏览器适配。
- `src/engine/`：UI 控件、布局、事件及动画。
- `src/core/`：输入与存储基础设施。
- `src/rendering/`：通用绘制工具。
- `src/ui/`、`src/data/`：示例界面与文案。
- `tests/`、`scripts/`：无第三方依赖的验证入口。
- [架构说明](docs/architecture.md)、[移植记录](docs/engine-port.md)。

本机私有配置、缓存和凭据不提交。提交使用 Conventional Commits，说明使用中文。
