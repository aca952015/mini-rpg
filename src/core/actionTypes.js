export const UI_ACTIONS = Object.freeze({
  SWITCH_VIEW: 'switchView',
  BACK: 'back',
  OPEN_MODAL: 'openModal',
  CLOSE_MODAL: 'closeModal',
  NOTICE: 'notice',
  REFRESH: 'refresh'
});

export const EVENTS = Object.freeze({
  ACTION_HANDLED: 'action:handled',
  ACTION_UNHANDLED: 'action:unhandled',
  ACTION_ERROR: 'action:error',
  VIEW_CHANGED: 'ui:viewChanged',
  MODAL_OPENED: 'ui:modalOpened',
  MODAL_CLOSED: 'ui:modalClosed'
});
