// Tiny DOM helpers. No framework: h() creates real elements.
//
//   h('button', { class: 'ck-btn', onClick: save, disabled: !valid }, 'Save')
//
// Props: class, style (object; numbers get px, --custom-props allowed), dataset,
// onXxx event listeners (onPointerdown, onDblclick…), html (innerHTML), value/checked/
// disabled/selected as properties, everything else as attributes.

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set(['svg', 'path', 'g', 'circle', 'rect', 'line', 'polyline']);
const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'indeterminate', 'readOnly', 'multiple']);
const UNITLESS = new Set(['opacity', 'zIndex', 'flex', 'flexGrow', 'flexShrink', 'fontWeight', 'lineHeight', 'order']);

export function append(el, children) {
  for (const child of children) {
    if (child == null || child === false || child === true) continue;
    if (Array.isArray(child)) append(el, child);
    else if (child instanceof Node) el.appendChild(child);
    else el.appendChild(document.createTextNode(String(child)));
  }
  return el;
}

export function setStyle(el, style) {
  for (const [k, v] of Object.entries(style)) {
    if (v == null || v === false) continue;
    if (k.startsWith('--')) el.style.setProperty(k, String(v));
    else el.style[k] = typeof v === 'number' && !UNITLESS.has(k) ? `${v}px` : v;
  }
}

export function h(tag, props = null, ...children) {
  const isSvg = SVG_TAGS.has(tag);
  const el = isSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  let deferred = null;
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') {
        if (isSvg) el.setAttribute('class', v);
        else el.className = v;
      } else if (k === 'style') {
        if (typeof v === 'string') el.style.cssText = v;
        else setStyle(el, v);
      } else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (PROPS.has(k)) (deferred ??= []).push([k, v]); // after children (a <select> needs its options first)
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  if (deferred) for (const [k, v] of deferred) el[k] = v;
  return el;
}

/** Inline 16×16 stroke icon from an SVG path. */
export function icon(d, size = 16) {
  return h(
    'svg',
    { viewBox: '0 0 16 16', width: size, height: size, 'aria-hidden': 'true' },
    h('path', { d, fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
  );
}

export const ICONS = {
  prev: 'M10 3 5 8l5 5',
  next: 'M6 3l5 5-5 5',
  down: 'M3 6l5 5 5-5',
  close: 'M4 4l8 8M12 4l-8 8',
  undo: 'M5.5 3.5 2.5 6.5l3 3M2.5 6.5h7a4 4 0 0 1 0 8h-2',
  redo: 'M10.5 3.5l3 3-3 3M13.5 6.5h-7a4 4 0 0 0 0 8h2',
  minus: 'M3 8h10',
  plus: 'M3 8h10M8 3v10',
  sidebar: 'M2.5 3.5h11v9h-11zM6 3.5v9',
  repeat: 'M11.5 2.5 13.5 4.5 11.5 6.5M13.5 4.5H5a2.5 2.5 0 0 0-2.5 2.5v.5M4.5 13.5 2.5 11.5 4.5 9.5M2.5 11.5H11a2.5 2.5 0 0 0 2.5-2.5v-.5',
};

/** Turn an HTML string into a DocumentFragment. The string is NOT sanitized. */
export function fromHTML(html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  return t.content;
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escape text for safe use inside an HTML string (e.g. in an eventRenderer). */
export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/**
 * Rebuild part of the UI while keeping keyboard focus (and caret) on the
 * element with the same data-key, so re-rendering never steals focus.
 */
export function keepFocus(root, fn) {
  const active = document.activeElement;
  const keyed = active && root.contains(active) ? active.closest('[data-key]') : null;
  const key = keyed?.dataset.key;
  let sel = null;
  if (key && active === keyed && typeof active.selectionStart === 'number') {
    try {
      sel = [active.selectionStart, active.selectionEnd];
    } catch {
      sel = null;
    }
  }
  fn();
  if (!key) return;
  const next = [...root.querySelectorAll('[data-key]')].find((el) => el.dataset.key === key);
  if (next && next !== document.activeElement) {
    next.focus({ preventScroll: true });
    if (sel) {
      try {
        next.setSelectionRange(sel[0], sel[1]);
      } catch {
        /* not a text input */
      }
    }
  }
}

export const raf = (fn) =>
  typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : setTimeout(fn, 16);
export const cancelRaf = (id) =>
  typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id);
