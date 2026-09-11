export const DEMO = {
  title: '射箭冒险',
  subtitle: '引擎基础已就绪',
  description: '平台适配 · 界面控件 · 本地存档',
  increment: '测试升级',
  effect: '播放命中特效',
  saved: '进度已保存',
  failed: '存档失败，请重试',
  count: (value) => `已完成 ${value} 次升级测试`,
  footer: '当前为基础功能示例，尚未接入正式战斗。'
};

export const DEMO_SAVE_KEY = 'mini_rpg_demo_v1';
export const isDemoSave = (value) => !!value && value.version === 1
  && Number.isSafeInteger(value.clicks) && value.clicks >= 0;
