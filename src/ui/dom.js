const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  applyAttrs(node, attrs);
  appendChildren(node, children);
  return node;
}

export function svgEl(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NAMESPACE, tag);
  applyAttrs(node, attrs);
  appendChildren(node, children);
  return node;
}

export function clear(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function applyAttrs(node, attrs) {
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) {
      continue;
    }

    if (key === 'text') {
      node.textContent = String(value);
      continue;
    }

    if (key === 'dataset') {
      Object.assign(node.dataset, value);
      continue;
    }

    if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
      continue;
    }

    node.setAttribute(key, value === true ? '' : String(value));
  }
}

function appendChildren(node, children) {
  const items = Array.isArray(children) ? children : [children];

  for (const child of items) {
    if (child === undefined || child === null || child === false) {
      continue;
    }

    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}
