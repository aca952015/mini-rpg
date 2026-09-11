function resolveRuntime(runtime) {
  return runtime?.tt || runtime;
}

function resolveAnimationHost(runtime, ttRuntime) {
  return runtime && runtime !== ttRuntime ? runtime : ttRuntime;
}

export function createDouyinPlatform(runtime = globalThis) {
  const ttRuntime = resolveRuntime(runtime);
  if (!ttRuntime) throw new Error('Douyin platform requires a tt runtime');

  const animationHost = resolveAnimationHost(runtime, ttRuntime);
  const fallbackHost = typeof globalThis !== 'undefined' ? globalThis : animationHost;
  let canvas = null;

  const getSystemInfo = () => ttRuntime.getSystemInfoSync?.() || {};
  const getViewportSize = () => {
    const info = getSystemInfo();
    return {
      width: Number(info.windowWidth || info.screenWidth || 0),
      height: Number(info.windowHeight || info.screenHeight || 0)
    };
  };

  const storage = {
    get(key) {
      return ttRuntime.getStorageSync(key);
    },
    set(key, value) {
      return ttRuntime.setStorageSync(key, value);
    },
    remove(key) {
      return ttRuntime.removeStorageSync(key);
    },
    getInfo() {
      return ttRuntime.getStorageInfoSync?.() || { keys: [] };
    },
    handleWriteFailure(error) {
      console.error('保存数据失败:', error);
      throw error;
    }
  };

  return {
    kind: 'douyin',
    getViewportSize,
    getSafeArea() {
      const info = getSystemInfo();
      const viewport = getViewportSize();
      const safeArea = info.safeArea || {};
      const safeTop = Number(safeArea.top || 0);
      const safeLeft = Number(safeArea.left || 0);
      const safeRight = Math.max(0, viewport.width - Number(safeArea.right ?? viewport.width));
      const safeBottom = Math.max(0, viewport.height - Number(safeArea.bottom ?? viewport.height));

      let menuLayout = null;
      try {
        menuLayout = ttRuntime.getMenuButtonLayout?.() || null;
      } catch (_) {
        // Some tool/runtime versions expose system safeArea but not menu layout.
      }
      const menuBottom = menuLayout
        ? Number(menuLayout.bottom ?? (Number(menuLayout.top || 0) + Number(menuLayout.height || 0)))
        : 0;

      return {
        top: Math.max(safeTop, menuBottom),
        right: safeRight,
        bottom: safeBottom,
        left: safeLeft
      };
    },
    getCanvas() {
      return canvas;
    },
    createCanvas() {
      canvas = canvas || ttRuntime.createCanvas();
      return canvas;
    },
    createImage() {
      return ttRuntime.createImage();
    },
    bindInput(targetCanvas, handlers = {}) {
      let activeTouchId = null;
      const toPoint = (touch, event) => ({
        x: Number(touch?.clientX ?? touch?.x ?? 0),
        y: Number(touch?.clientY ?? touch?.y ?? 0),
        pointerId: touch?.identifier ?? 0,
        pointerType: 'touch',
        originalEvent: event
      });
      const findActiveTouch = (touches = []) => Array.from(touches || [])
        .find((touch) => (touch?.identifier ?? 0) === activeTouchId);
      const onStart = (event = {}) => {
        if (activeTouchId !== null) return;
        const touch = event.changedTouches?.[0] || event.touches?.[0];
        if (!touch) return;
        activeTouchId = touch.identifier ?? 0;
        handlers.start?.(toPoint(touch, event));
      };
      const onMove = (event = {}) => {
        const touch = findActiveTouch(event.touches);
        if (touch) handlers.move?.(toPoint(touch, event));
      };
      const finishTouch = (event, methodName) => {
        const touch = findActiveTouch(event.changedTouches);
        if (!touch) return;
        activeTouchId = null;
        handlers[methodName]?.(toPoint(touch, event));
      };
      const onEnd = (event = {}) => finishTouch(event, 'end');
      const onCancel = (event = {}) => finishTouch(event, 'cancel');

      ttRuntime.onTouchStart?.(onStart);
      ttRuntime.onTouchMove?.(onMove);
      ttRuntime.onTouchEnd?.(onEnd);
      ttRuntime.onTouchCancel?.(onCancel);

      return () => {
        ttRuntime.offTouchStart?.(onStart);
        ttRuntime.offTouchMove?.(onMove);
        ttRuntime.offTouchEnd?.(onEnd);
        ttRuntime.offTouchCancel?.(onCancel);
        activeTouchId = null;
      };
    },
    storage,
    onShow(callback) {
      ttRuntime.onShow?.(callback);
      return () => ttRuntime.offShow?.(callback);
    },
    onHide(callback) {
      ttRuntime.onHide?.(callback);
      return () => ttRuntime.offHide?.(callback);
    },
    onResize(callback) {
      if (typeof ttRuntime.onWindowResize !== 'function') return () => {};
      const handler = (size = {}) => {
        const nextSize = size.size || size;
        const viewport = nextSize.windowWidth || nextSize.windowHeight
          ? { width: Number(nextSize.windowWidth || 0), height: Number(nextSize.windowHeight || 0) }
          : getViewportSize();
        callback(viewport);
      };
      ttRuntime.onWindowResize(handler);
      return () => ttRuntime.offWindowResize?.(handler);
    },
    requestAnimationFrame(callback) {
      if (typeof animationHost?.requestAnimationFrame === 'function') return animationHost.requestAnimationFrame(callback);
      if (typeof fallbackHost?.requestAnimationFrame === 'function') return fallbackHost.requestAnimationFrame(callback);
      return fallbackHost.setTimeout(() => callback(this.now()), 16);
    },
    cancelAnimationFrame(id) {
      if (typeof animationHost?.cancelAnimationFrame === 'function') {
        animationHost.cancelAnimationFrame(id);
        return;
      }
      if (typeof fallbackHost?.cancelAnimationFrame === 'function') {
        fallbackHost.cancelAnimationFrame(id);
        return;
      }
      fallbackHost.clearTimeout(id);
    },
    now() {
      const performanceHost = animationHost?.performance || fallbackHost?.performance;
      return typeof performanceHost?.now === 'function' ? performanceHost.now() : Date.now();
    },
    setCursor() {
      // Touch-only runtime.
    }
  };
}
