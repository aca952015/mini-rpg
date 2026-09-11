export const DEMO = {
  title: '射箭冒险',
  subtitle: '交互基础已就绪',
  description: '页面导航 · 弹窗确认 · 本地存档',
  increment: '测试升级',
  effect: '播放命中特效',
  saved: '进度已保存',
  failed: '存档失败，请重试',
  actionFailed: '操作失败，请重试',
  training: '训练',
  progress: '成长',
  progressTitle: '成长记录',
  progressDescription: '训练进度会自动保存在本机。',
  openConfirm: '升级确认',
  confirmTitle: '再训练一次？',
  confirmDescription: '确认后增加一次训练记录并保存。',
  confirm: '确认升级',
  cancel: '返回',
  count: (value) => `已完成 ${value} 次升级测试`,
  footer: '当前为基础功能示例，尚未接入正式战斗。'
};

export const DEMO_SAVE_KEY = 'mini_rpg_demo_v1';
export const isDemoSave = (value) => !!value && value.version === 1
  && Number.isSafeInteger(value.clicks) && value.clicks >= 0;
