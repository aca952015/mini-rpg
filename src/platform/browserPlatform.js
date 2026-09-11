function resolveWindow(runtime) {
  return runtime?.window || runtime;
}

function resolveDocument(runtime, windowRuntime) {
  return runtime?.document || windowRuntime?.document || null;
}

export function createBrowserPlatform(runtime = globalThis) {
  const windowRuntime = resolveWindow(runtime);
  const documentRuntime = resolveDocument(runtime, windowRuntime);
  const storageRuntime = runtime?.localStorage || windowRuntime?.localStorage || null;
  let canvas = null;

  const requireStorage = () => {
    if (!storageRuntime) {
      throw new Error('Browser platform requires localStorage for persistence');
    }
    return storageRuntime;
  };

  const validateStorage = () => {
    const activeStorage = requireStorage();
    const probeKey = `__mini_rpg_storage_probe__${Date.now()}_${Math.random()}`;
    const probeValue = 'ok';

    try {
      activeStorage.getItem(probeKey);
    } catch (error) {
      throw new Error(`Browser localStorage read probe failed: ${error?.message || String(error)}`);
    }

    try {
      activeStorage.setItem(probeKey, probeValue);
    } catch (error) {
      throw new Error(`Browser localStorage write probe failed: ${error?.message || String(error)}`);
    }

    try {
      if (activeStorage.getItem(probeKey) !== probeValue) {
        throw new Error('stored probe value could not be read back');
      }
    } catch (error) {
      try {
        activeStorage.removeItem(probeKey);
      } catch (_) {
        // Keep the read failure as the startup error.
      }
      throw new Error(`Browser localStorage read-back probe failed: ${error?.message || String(error)}`);
    }

    try {
      activeStorage.removeItem(probeKey);
    } catch (error) {
      throw new Error(`Browser localStorage cleanup probe failed: ${error?.message || String(error)}`);
    }

    return true;
  };

  const getViewportSize = () => {
    const root = documentRuntime?.documentElement;
    return {
      width: Number(windowRuntime?.innerWidth || root?.clientWidth || 0),
      height: Number(windowRuntime?.innerHeight || root?.clientHeight || 0)
    };
  };

  const storage = {
    get(key) {
      return requireStorage().getItem(key);
    },
    set(key, value) {
      requireStorage().setItem(key, value);
    },
    remove(key) {
      requireStorage().removeItem(key);
    },
    getInfo() {
      const activeStorage = requireStorage();
      const keys = [];
      const length = Number(activeStorage.length || 0);
      for (let index = 0; index < length; index += 1) {
        const key = activeStorage.key(index);
        if (key !== null && key !== undefined) keys.push(key);
      }
      return { keys };
    },
    handleWriteFailure(error) {
      console.error('保存数据失败:', error);
      throw error;
    }
  };

  return {
    kind: 'browser',
    validateStorage,
    getViewportSize,
    getSafeArea() {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    },
    getCanvas() {
      if (!canvas) {
        canvas = documentRuntime?.getElementById?.('game-canvas')
          || documentRuntime?.querySelector?.('canvas')
          || null;
      }
      return canvas;
    },
    createCanvas() {
      const existing = this.getCanvas();
      if (existing) return existing;
      if (typeof documentRuntime?.createElement !== 'function') {
        throw new Error('Browser platform requires document.createElement to create a canvas');
      }
      canvas = documentRuntime.createElement('canvas');
      canvas.id = canvas.id || 'game-canvas';
      documentRuntime.body?.appendChild?.(canvas);
      return canvas;
    },
    createImage() {
      const ImageConstructor = runtime?.Image || windowRuntime?.Image;
      if (typeof ImageConstructor === 'function') return new ImageConstructor();
      if (typeof documentRuntime?.createElement === 'function') return documentRuntime.createElement('img');
      throw new Error('Browser platform requires an Image constructor');
    },
    bindInput(targetCanvas, handlers = {}) {
      if (typeof targetCanvas?.addEventListener !== 'function') return () => {};

      let activePointerId = null;
      let windowMoveFallbackActive = false;
      const canvasMoveEvents = new WeakSet();
      const listenerOptions = { passive: false };
      const previousTouchAction = targetCanvas.style?.touchAction;
      if (targetCanvas.style) targetCanvas.style.touchAction = 'none';

      const toPoint = (event) => {
        const rect = targetCanvas.getBoundingClientRect?.() || {
          left: 0,
          top: 0,
          width: targetCanvas.width || 1,
          height: targetCanvas.height || 1
        };
        const rectWidth = Number(rect.width || targetCanvas.width || 1);
        const rectHeight = Number(rect.height || targetCanvas.height || 1);
        return {
          x: (Number(event.clientX || 0) - Number(rect.left || 0)) * Number(targetCanvas.width || rectWidth) / rectWidth,
          y: (Number(event.clientY || 0) - Number(rect.top || 0)) * Number(targetCanvas.height || rectHeight) / rectHeight,
          pointerId: event.pointerId,
          pointerType: event.pointerType || 'mouse',
          originalEvent: event
        };
      };

      const onWindowPointerMove = (event) => {
        if (event.pointerId !== activePointerId || canvasMoveEvents.has(event)) return;
        event.preventDefault?.();
        handlers.move?.(toPoint(event));
      };
      const installWindowMoveFallback = () => {
        if (windowMoveFallbackActive) return;
        windowRuntime?.addEventListener?.('pointermove', onWindowPointerMove, listenerOptions);
        windowMoveFallbackActive = true;
      };
      const removeWindowMoveFallback = () => {
        if (!windowMoveFallbackActive) return;
        windowRuntime?.removeEventListener?.('pointermove', onWindowPointerMove, listenerOptions);
        windowMoveFallbackActive = false;
      };
      const onPointerDown = (event) => {
        if (
          activePointerId !== null
          || event.isPrimary === false
          || (event.pointerType === 'mouse' && event.button !== undefined && event.button !== 0)
        ) return;
        event.preventDefault?.();
        activePointerId = event.pointerId;
        if (typeof targetCanvas.setPointerCapture !== 'function') {
          installWindowMoveFallback();
        } else {
          try {
            targetCanvas.setPointerCapture(event.pointerId);
          } catch (_) {
            installWindowMoveFallback();
          }
        }
        handlers.start?.(toPoint(event));
      };
      const onPointerMove = (event) => {
        const point = toPoint(event);
        if (event.pointerId === activePointerId) {
          if (windowMoveFallbackActive) canvasMoveEvents.add(event);
          event.preventDefault?.();
          handlers.move?.(point);
        } else if (activePointerId === null) {
          handlers.hover?.(point);
        }
      };
      const finishPointer = (event, methodName) => {
        if (event.pointerId !== activePointerId) return;
        event.preventDefault?.();
        const point = toPoint(event);
        activePointerId = null;
        removeWindowMoveFallback();
        try {
          targetCanvas.releasePointerCapture?.(event.pointerId);
        } catch (_) {
          // Cancellation may release capture before this callback.
        }
        handlers[methodName]?.(point);
      };
      const onPointerUp = (event) => finishPointer(event, 'end');
      const onPointerCancel = (event) => finishPointer(event, 'cancel');
      const onPointerLeave = () => {
        if (activePointerId === null) handlers.leave?.();
      };

      targetCanvas.addEventListener('pointerdown', onPointerDown, listenerOptions);
      targetCanvas.addEventListener('pointermove', onPointerMove, listenerOptions);
      targetCanvas.addEventListener('pointerup', onPointerUp, listenerOptions);
      targetCanvas.addEventListener('pointercancel', onPointerCancel, listenerOptions);
      targetCanvas.addEventListener('pointerleave', onPointerLeave);
      windowRuntime?.addEventListener?.('pointerup', onPointerUp, listenerOptions);
      windowRuntime?.addEventListener?.('pointercancel', onPointerCancel, listenerOptions);

      return () => {
        targetCanvas.removeEventListener?.('pointerdown', onPointerDown, listenerOptions);
        targetCanvas.removeEventListener?.('pointermove', onPointerMove, listenerOptions);
        targetCanvas.removeEventListener?.('pointerup', onPointerUp, listenerOptions);
        targetCanvas.removeEventListener?.('pointercancel', onPointerCancel, listenerOptions);
        targetCanvas.removeEventListener?.('pointerleave', onPointerLeave);
        windowRuntime?.removeEventListener?.('pointerup', onPointerUp, listenerOptions);
        windowRuntime?.removeEventListener?.('pointercancel', onPointerCancel, listenerOptions);
        removeWindowMoveFallback();
        if (targetCanvas.style) targetCanvas.style.touchAction = previousTouchAction || '';
        activePointerId = null;
      };
    },
    storage,
    onShow(callback) {
      const visibilityHandler = () => {
        if (!documentRuntime?.hidden) callback();
      };
      documentRuntime?.addEventListener?.('visibilitychange', visibilityHandler);
      windowRuntime?.addEventListener?.('pageshow', callback);
      return () => {
        documentRuntime?.removeEventListener?.('visibilitychange', visibilityHandler);
        windowRuntime?.removeEventListener?.('pageshow', callback);
      };
    },
    onHide(callback) {
      const visibilityHandler = () => {
        if (documentRuntime?.hidden) callback();
      };
      documentRuntime?.addEventListener?.('visibilitychange', visibilityHandler);
      windowRuntime?.addEventListener?.('pagehide', callback);
      return () => {
        documentRuntime?.removeEventListener?.('visibilitychange', visibilityHandler);
        windowRuntime?.removeEventListener?.('pagehide', callback);
      };
    },
    onResize(callback) {
      const handler = () => callback(getViewportSize());
      windowRuntime?.addEventListener?.('resize', handler);
      return () => windowRuntime?.removeEventListener?.('resize', handler);
    },
    requestAnimationFrame(callback) {
      if (typeof windowRuntime?.requestAnimationFrame === 'function') return windowRuntime.requestAnimationFrame(callback);
      return windowRuntime.setTimeout(() => callback(this.now()), 16);
    },
    cancelAnimationFrame(id) {
      if (typeof windowRuntime?.cancelAnimationFrame === 'function') {
        windowRuntime.cancelAnimationFrame(id);
        return;
      }
      windowRuntime.clearTimeout(id);
    },
    now() {
      return typeof windowRuntime?.performance?.now === 'function'
        ? windowRuntime.performance.now()
        : Date.now();
    },
    setCursor(cursor = 'default') {
      if (documentRuntime?.body?.style) documentRuntime.body.style.cursor = cursor;
    }
  };
}
