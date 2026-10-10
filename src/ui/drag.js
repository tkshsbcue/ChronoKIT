// Pointer drag helper shared by all views. Listens on window so the drag keeps
// working when the pointer leaves the element, auto-scrolls the given scroll
// container near its edges, and cancels on Escape.

export function startDrag(downEvent, { onStart, onMove, onEnd, onCancel, threshold = 4, scrollEl = null } = {}) {
  const sx = downEvent.clientX;
  const sy = downEvent.clientY;
  let started = false;
  let done = false;
  let last = downEvent;
  let raf = 0;

  const autoScroll = () => {
    if (done || !scrollEl) return;
    raf = requestAnimationFrame(autoScroll);
    const r = scrollEl.getBoundingClientRect();
    const edge = 36;
    const speed = 16;
    const push = (pos, lo, hi) => {
      if (pos < lo + edge) return -speed * Math.min(1, (lo + edge - pos) / edge);
      if (pos > hi - edge) return speed * Math.min(1, (pos - (hi - edge)) / edge);
      return 0;
    };
    const dx = push(last.clientX, r.left, r.right);
    const dy = push(last.clientY, r.top, r.bottom);
    if (!dx && !dy) return;
    const beforeX = scrollEl.scrollLeft;
    const beforeY = scrollEl.scrollTop;
    scrollEl.scrollLeft += dx;
    scrollEl.scrollTop += dy;
    if (scrollEl.scrollLeft !== beforeX || scrollEl.scrollTop !== beforeY) onMove?.(last);
  };

  const move = (e) => {
    last = e;
    if (!started) {
      if (Math.hypot(e.clientX - sx, e.clientY - sy) < threshold) return;
      started = true;
      document.body.classList.add('ck-body-dragging');
      onStart?.(e);
      if (scrollEl && typeof requestAnimationFrame !== 'undefined') raf = requestAnimationFrame(autoScroll);
    }
    e.preventDefault?.();
    onMove?.(e);
  };

  const cleanup = () => {
    done = true;
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    window.removeEventListener('keydown', key, true);
    document.body.classList.remove('ck-body-dragging');
  };

  const up = (e) => {
    cleanup();
    onEnd?.(e, started);
  };

  const cancel = () => {
    cleanup();
    onCancel?.();
  };

  const key = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      cancel();
    }
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);
  window.addEventListener('keydown', key, true);
  return cancel;
}
