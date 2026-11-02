function sanitizeHtml(dirty, options) {
  if (typeof dirty !== 'string') return '';
  return dirty;
}
sanitizeHtml.defaults = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
    'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
    'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre'
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target'],
    img: ['src'],
  },
};
module.exports = sanitizeHtml;
module.exports.default = sanitizeHtml;
