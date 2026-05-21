// draft-convert ↔ Draft.js conversion config.
//
// What this covers:
//   - IMAGE entity ⇄ <img>           (so toolbar-added images survive a round trip
//                                     and admin-deleted images are actually removed
//                                     because they no longer appear in the entity list)
//   - color / bgcolor / fontsize /   (react-draft-wysiwyg stores these as custom
//     fontfamily inline styles ⇄      inline styles like `color-rgb(…)`; without
//     <span style="…">                explicit handlers they get silently dropped
//                                     on save → "color does not save")

import React from 'react';

// === draft-js → HTML =====================================================
export const draftToHTMLConfig = {
  styleToHTML: (style) => {
    if (typeof style !== 'string') return null;
    if (style.indexOf('color-') === 0) {
      const color = style.slice('color-'.length);
      return <span style={{ color }} />;
    }
    if (style.indexOf('bgcolor-') === 0) {
      const bg = style.slice('bgcolor-'.length);
      return <span style={{ backgroundColor: bg }} />;
    }
    if (style.indexOf('fontsize-') === 0) {
      const size = style.slice('fontsize-'.length);
      return <span style={{ fontSize: `${size}px` }} />;
    }
    if (style.indexOf('fontfamily-') === 0) {
      const family = style.slice('fontfamily-'.length);
      return <span style={{ fontFamily: family }} />;
    }
    return null;
  },
  blockToHTML: (block) => {
    // Atomic blocks (e.g. an image entity wrapper) — render nothing here
    // so we don't leak an extra <p></p>. The entity itself is rendered
    // by entityToHTML below.
    if (block.type === 'atomic') return { start: '', end: '' };
    return null;
  },
  entityToHTML: (entity, originalText) => {
    if (entity.type === 'IMAGE' || entity.type === 'image') {
      const { src = '', alt = '', height, width } = entity.data || {};
      const h = height && height !== 'auto' ? ` height="${height}"` : '';
      const w = width && width !== 'auto' ? ` width="${width}"` : '';
      return `<img src="${src}" alt="${alt}"${h}${w} />`;
    }
    if (entity.type === 'LINK' || entity.type === 'link') {
      const { url = '#', targetOption = '_self' } = entity.data || {};
      return <a href={url} target={targetOption}>{originalText}</a>;
    }
    return originalText;
  },
};

// === HTML → draft-js =====================================================
const COLOR_RE = /(^|;)\s*color\s*:\s*([^;]+)/i;
const BGCOLOR_RE = /(^|;)\s*background-color\s*:\s*([^;]+)/i;
const FONTSIZE_RE = /(^|;)\s*font-size\s*:\s*([^;]+)/i;
const FONTFAMILY_RE = /(^|;)\s*font-family\s*:\s*([^;]+)/i;

function readStyleAttr(node) {
  // Element.style on jsdom-style nodes; falls back to attribute parsing for
  // server / draft-convert's tree where `style` may be a string.
  const styleAttr =
    (node && node.getAttribute && node.getAttribute('style')) || '';
  return String(styleAttr || '');
}

export const draftFromHTMLConfig = {
  htmlToStyle: (nodeName, node, currentStyle) => {
    if (nodeName !== 'span' && nodeName !== 'font') return currentStyle;
    const style = readStyleAttr(node);
    let next = currentStyle;
    const color = style.match(COLOR_RE)?.[2]?.trim();
    if (color) next = next.add(`color-${color}`);
    const bg = style.match(BGCOLOR_RE)?.[2]?.trim();
    if (bg) next = next.add(`bgcolor-${bg}`);
    const size = style.match(FONTSIZE_RE)?.[2]?.trim();
    if (size) {
      const px = parseInt(size, 10);
      if (Number.isFinite(px)) next = next.add(`fontsize-${px}`);
    }
    const family = style.match(FONTFAMILY_RE)?.[2]?.trim();
    if (family) next = next.add(`fontfamily-${family.replace(/['"]/g, '')}`);
    return next;
  },
  htmlToBlock: (nodeName) => {
    if (nodeName === 'img') return { type: 'atomic', data: {} };
    return undefined;
  },
  htmlToEntity: (nodeName, node, createEntity) => {
    if (nodeName === 'img') {
      return createEntity('IMAGE', 'IMMUTABLE', {
        src: node.getAttribute('src') || '',
        alt: node.getAttribute('alt') || '',
        height: node.getAttribute('height') || undefined,
        width: node.getAttribute('width') || undefined,
      });
    }
    if (nodeName === 'a') {
      return createEntity('LINK', 'MUTABLE', {
        url: node.getAttribute('href') || '#',
        targetOption: node.getAttribute('target') || '_self',
      });
    }
    return undefined;
  },
};
