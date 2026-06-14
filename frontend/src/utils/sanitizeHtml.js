import DOMPurify from 'dompurify';

const ALLOWED_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'a',
    'h1', 'h2', 'h3', 'h4', 'blockquote', 'span', 'div'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
};

export function sanitizeHtml(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, ALLOWED_CONFIG);
}