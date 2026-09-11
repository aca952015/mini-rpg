import { EventManager } from '../engine/event.js';
import { EVENTS } from './actionTypes.js';

function isActionType(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function normalizeAction(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  if (isActionType(raw.action) && (!isActionType(raw.type) || raw.type === 'button')) {
    return {
      type: raw.action,
      data: raw.data ?? {}
    };
  }

  if (!isActionType(raw.type) || raw.type === 'button') return null;

  const { type, ...data } = raw;
  return { type, data };
}

export class ActionRouter {
  constructor(events) {
    this.events = events || new EventManager();
    this._ownsEvents = !events;
    this._handlers = new Map();
    this._destroyed = false;
  }

  register(type, handler) {
    if (this._destroyed) {
      throw new Error('ActionRouter has been destroyed');
    }
    if (!isActionType(type)) {
      throw new TypeError('Action type must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('Action handler must be a function');
    }
    if (this._handlers.has(type)) {
      throw new Error(`Action handler already registered: ${type}`);
    }

    this._handlers.set(type, handler);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      if (this._handlers.get(type) === handler) {
        this._handlers.delete(type);
      }
    };
  }

  dispatch(raw) {
    const action = normalizeAction(raw);
    if (!action) return { status: 'invalid', action: null };

    if (this._destroyed) {
      return {
        status: 'invalid',
        action,
        error: new Error('ActionRouter has been destroyed')
      };
    }

    const handler = this._handlers.get(action.type);
    if (!handler) {
      const outcome = { status: 'unhandled', action };
      this.events.emit(EVENTS.ACTION_UNHANDLED, outcome);
      return outcome;
    }

    let result;
    try {
      result = handler(action.data, action);
    } catch (error) {
      return this._error(action, error);
    }

    if (result && typeof result.then === 'function') {
      return Promise.resolve(result).then(
        value => this._handled(action, value),
        error => this._error(action, error)
      );
    }

    return this._handled(action, result);
  }

  _handled(action, result) {
    if (this._destroyed) return this._disposedOutcome(action);
    const outcome = { status: 'handled', action, result };
    this.events.emit(EVENTS.ACTION_HANDLED, outcome);
    return outcome;
  }

  _error(action, error) {
    if (this._destroyed) return this._disposedOutcome(action);
    const outcome = { status: 'error', action, error };
    this.events.emit(EVENTS.ACTION_ERROR, outcome);
    return outcome;
  }

  _disposedOutcome(action) {
    return { status: 'invalid', action, error: new Error('ActionRouter has been destroyed') };
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._handlers.clear();
    if (this._ownsEvents) this.events.clear();
  }
}
