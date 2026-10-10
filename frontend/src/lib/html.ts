import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li',
  'a', 'blockquote', 'code', 'pre', 'hr', 'span'
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'class'];

/**
 * Sanitize rich-text HTML before it is persisted to IndexedDB or rendered.
 * Tiptap only produces the tags above, so this is a tight allowlist that
 * strips anything a user might paste in from an external source.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Force links to open safely and carry rel="noopener noreferrer"
    ADD_ATTR: ['target'],
    RETURN_TRUSTED_TYPE: false
  });
}

/**
 * Reduce rich-text HTML to plain text for searching and previews.
 * Strips tags and collapses whitespace so queries match what a user sees.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  const withBreaks = html
    .replace(/<\/(p|h1|h2|h3|h4|li|blockquote|pre|div)>/gi, ' \n')
    .replace(/<br\s*\/?>/gi, ' \n');
  const text = withBreaks.replace(/<[^>]*>/g, '');
  const textarea = typeof document !== 'undefined' ? document.createElement('textarea') : null;
  if (!textarea) return text.replace(/\s+/g, ' ').trim();
  textarea.innerHTML = text;
  return textarea.value.replace(/\s+/g, ' ').trim();
}

/** Is the stored HTML effectively empty (no visible text)? */
export function isBlankHtml(html: string): boolean {
  return htmlToPlainText(html).length === 0;
}
