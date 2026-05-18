// draft-convert ↔ Draft.js IMAGE entity config.
//
// Without these, inline images added via the wysiwyg toolbar are silently
// dropped when the editor state is serialized to HTML (and never re-hydrate
// when loading saved content back into the editor), because draft-convert's
// defaults don't know about Draft's IMAGE entity / atomic image blocks.

export const draftToHTMLConfig = {
  entityToHTML: (entity, originalText) => {
    if (entity.type === 'IMAGE' || entity.type === 'image') {
      const { src = '', alt = '', height, width } = entity.data || {};
      const h = height ? ` height="${height}"` : '';
      const w = width ? ` width="${width}"` : '';
      return `<img src="${src}" alt="${alt}"${h}${w} />`;
    }
    return originalText;
  },
};

export const draftFromHTMLConfig = {
  htmlToBlock: (nodeName) => {
    if (nodeName === 'img') return { type: 'atomic', data: {} };
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
  },
};
