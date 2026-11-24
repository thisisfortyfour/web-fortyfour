// Small runtime that renders the site's Design Component pages (template + logic class) with React.
import React from 'react';
import { createRoot } from 'react-dom/client';
// Spanish only. Clear an old language choice left by the English version that was removed.
try { localStorage.removeItem('ff-lang'); } catch (e) {}
const tr = (s) => s;
const translateTemplate = () => {};

const h = React.createElement;
const HOLE_WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
const ATTR = { class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength', minlength: 'minLength',
  autocomplete: 'autoComplete', autoplay: 'autoPlay', playsinline: 'playsInline', novalidate: 'noValidate', srcset: 'srcSet',
  crossorigin: 'crossOrigin', inputmode: 'inputMode', enterkeyhint: 'enterKeyHint', colspan: 'colSpan', rowspan: 'rowSpan',
  contenteditable: 'contentEditable', fetchpriority: 'fetchPriority', referrerpolicy: 'referrerPolicy', accesskey: 'accessKey' };
const BOOL = new Set(['muted', 'loop', 'autoplay', 'playsinline', 'required', 'disabled', 'checked', 'hidden', 'novalidate', 'readonly', 'multiple', 'selected', 'open', 'controls', 'autofocus']);
const EVENTS = ['click', 'dblclick', 'mouseenter', 'mouseleave', 'mousemove', 'mousedown', 'mouseup', 'mouseover', 'mouseout', 'focus', 'blur', 'input', 'change', 'submit',
  'keydown', 'keyup', 'pointerdown', 'pointermove', 'pointerup', 'pointerleave', 'pointerenter', 'pointercancel', 'touchstart', 'touchmove', 'touchend', 'wheel', 'scroll',
  'load', 'error', 'ended', 'play', 'pause', 'timeupdate', 'loadeddata', 'loadedmetadata', 'canplay', 'contextmenu', 'animationend', 'transitionend'];
const EVT = {};
EVENTS.forEach((e) => { const name = { dblclick: 'DoubleClick', mouseenter: 'MouseEnter', mouseleave: 'MouseLeave', mousemove: 'MouseMove', mousedown: 'MouseDown', mouseup: 'MouseUp', mouseover: 'MouseOver', mouseout: 'MouseOut', keydown: 'KeyDown', keyup: 'KeyUp', pointerdown: 'PointerDown', pointermove: 'PointerMove', pointerup: 'PointerUp', pointerleave: 'PointerLeave', pointerenter: 'PointerEnter', pointercancel: 'PointerCancel', touchstart: 'TouchStart', touchmove: 'TouchMove', touchend: 'TouchEnd', timeupdate: 'TimeUpdate', loadeddata: 'LoadedData', loadedmetadata: 'LoadedMetadata', canplay: 'CanPlay', contextmenu: 'ContextMenu', animationend: 'AnimationEnd', transitionend: 'TransitionEnd' }[e] || (e[0].toUpperCase() + e.slice(1)); EVT['on' + e] = 'on' + name; });

function lookup(scope, path) {
  if (path === 'true') return true; if (path === 'false') return false; if (path === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(path)) return +path;
  if (/^'.*'$|^".*"$/.test(path)) return path.slice(1, -1);
  let v = scope;
  for (const k of path.split('.')) { if (v == null) return undefined; v = v[k]; }
  return v;
}
const str = (v) => (v == null || v === false ? '' : String(v));
function value(raw, scope) {
  const m = raw.match(HOLE_WHOLE);
  if (m) { const v = lookup(scope, m[1]); return typeof v === 'string' ? tr(v) : v; }
  if (raw.indexOf('{{') < 0) return raw;
  return tr(raw.replace(HOLE, (_, p) => str(lookup(scope, p))));
}
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
function styleObj(s) {
  if (s == null || typeof s === 'object') return s || undefined;
  const o = {};
  String(s).split(';').forEach((decl) => {
    const i = decl.indexOf(':'); if (i < 0) return;
    let k = decl.slice(0, i).trim(); const v = decl.slice(i + 1).trim(); if (!k) return;
    if (!k.startsWith('--')) {
      k = k.toLowerCase();
      if (k[0] === '-') { k = camel(k.slice(1)); if (!k.startsWith('ms')) k = k[0].toUpperCase() + k.slice(1); }
      else k = camel(k);
    }
    o[k] = v;
  });
  return o;
}

function compile(node) {
  if (node.nodeType === 3) return node.nodeValue;
  if (node.nodeType !== 1) return null;
  const tag = node.localName;
  const kids = Array.from(node.childNodes).map(compile).filter((c) => c != null);
  const attrs = Array.from(node.attributes).map((a) => [a.name, a.value]);
  if (tag === 'sc-for') return { k: 'for', list: node.getAttribute('list'), as: node.getAttribute('as') || 'item', kids };
  if (tag === 'sc-if') return { k: 'if', val: node.getAttribute('value'), kids };
  return { k: 'el', tag, attrs, kids, svg: node.namespaceURI === 'http://www.w3.org/2000/svg' };
}

function propsFor(n, scope) {
  const p = {};
  let ref = null;
  for (const [name, raw] of n.attrs) {
    const v = value(raw, scope);
    if (name === 'ref') { ref = typeof v === 'function' ? v : null; continue; }
    if (name === 'style') { p.style = styleObj(v); continue; }
    if (EVT[name]) { if (typeof v === 'function') p[EVT[name]] = v; continue; }
    if (name.startsWith('hint-')) continue;
    if (BOOL.has(name)) { const on = !(v === false || v === 'false' || v == null); p[ATTR[name] || name] = on; continue; }
    if (name.startsWith('aria-') || name.startsWith('data-')) { p[name] = v === true || v === false ? String(v) : v; continue; }
    let key = ATTR[name] || name;
    if (n.svg && name.indexOf('-') > 0 && name !== 'xlink:href') key = camel(name);
    p[key] = v;
  }
  if (n.tag === 'video' && p.muted) {
    const inner = ref;
    ref = (el) => { if (el) { el.muted = true; el.defaultMuted = true; } if (inner) inner(el); };
  }
  if (ref) p.ref = ref;
  return p;
}

function renderKids(kids, scope) { return kids.map((c, i) => renderNode(c, scope, i)); }
function renderNode(n, scope, key) {
  if (typeof n === 'string') return n.indexOf('{{') < 0 ? n : str(value(n, scope));
  if (n.k === 'if') { const v = value(n.val, scope); return v ? h(React.Fragment, { key }, ...renderKids(n.kids, scope)) : null; }
  if (n.k === 'for') {
    const list = value(n.list, scope) || [];
    return h(React.Fragment, { key }, ...Array.from(list).map((item, i) => {
      const s = Object.create(scope); s[n.as] = item; s.$index = i;
      return h(React.Fragment, { key: i }, ...renderKids(n.kids, s));
    }));
  }
  const p = propsFor(n, scope); p.key = key;
  if (n.tag === 'textarea' || n.tag === 'input') return h(n.tag, p);
  return h(n.tag, p, ...renderKids(n.kids, scope));
}

const escHtml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Puts the admin panel's texts, images and links into the page template before it renders.
function applyContent(root, c) {
  if (!c) return;
  const texts = c.texts || {}, images = c.images || {};
  root.querySelectorAll('[data-cms]').forEach((el) => {
    const k = el.getAttribute('data-cms');
    if (el.localName === 'img') {
      const v = images[k];
      if (v && v.video) {
        // A video in place of a photo: same classes and styles, plays muted on a loop.
        const vid = el.ownerDocument.createElement('video');
        Array.from(el.attributes).forEach((at) => { if (!/^(src|alt|loading|decoding|draggable)$/.test(at.name)) vid.setAttribute(at.name, at.value); });
        vid.setAttribute('src', v.video);
        if (v.src) vid.setAttribute('poster', v.src);
        ['muted', 'loop', 'autoplay', 'playsinline'].forEach((b) => vid.setAttribute(b, b));
        vid.setAttribute('preload', 'metadata');
        if (v.alt) vid.setAttribute('aria-label', v.alt);
        el.replaceWith(vid);
      } else if (v && v.src) { el.setAttribute('src', v.src); if (v.alt != null) el.setAttribute('alt', v.alt); }
    } else if (texts[k] != null && texts[k] !== '') {
      el.innerHTML = escHtml(texts[k]).replace(/\n/g, '<br>');
    }
  });
  root.querySelectorAll('[data-cms-href]').forEach((el) => {
    const v = texts[el.getAttribute('data-cms-href')];
    if (v) el.setAttribute('href', v);
  });
}

export function mount(tplEl, code, container) {
  applyContent(tplEl.content, window.__FF_CONTENT);
  translateTemplate(tplEl.content);
  const tree = Array.from(tplEl.content.childNodes).map(compile).filter((c) => c != null);
  class DCLogic extends React.Component {
    constructor(props) { super(props); if (!this.state) this.state = {}; }
    render() { const vals = this.renderVals ? this.renderVals() : {}; return h(React.Fragment, null, ...renderKids(tree, vals || {})); }
  }
  const Component = new Function('DCLogic', code + '\n;return Component;')(DCLogic);
  createRoot(container).render(h(Component, {}));
}
window.DCLite = { mount };
