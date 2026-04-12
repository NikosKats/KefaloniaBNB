/**
 * Server-side HTML sanitizer that strips dangerous elements and attributes.
 * Used for rendering user/admin-authored HTML content (blog posts, CMS pages).
 *
 * This is NOT a full DOMPurify replacement — it targets the most common XSS
 * vectors. For untrusted user input, consider adding a proper DOM-based
 * sanitizer like DOMPurify with jsdom.
 */

/** Remove <script>, <iframe>, <object>, <embed>, <form>, <base>, <meta> tags and their contents */
const DANGEROUS_TAGS = /<\s*\/?\s*(script|iframe|object|embed|form|base|meta|link|style)\b[^>]*>/gi;

/** Remove on* event handler attributes (onclick, onerror, onload, etc.) */
const EVENT_HANDLERS = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/** Remove javascript:, vbscript:, data: URL schemes in href/src/action attributes */
const DANGEROUS_URLS = /(href|src|action)\s*=\s*(?:"[^"]*(?:javascript|vbscript|data)\s*:[^"]*"|'[^']*(?:javascript|vbscript|data)\s*:[^']*')/gi;

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '') // script with content
    .replace(/<\s*style\b[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, '')   // style with content
    .replace(DANGEROUS_TAGS, '')
    .replace(EVENT_HANDLERS, '')
    .replace(DANGEROUS_URLS, '');
}
