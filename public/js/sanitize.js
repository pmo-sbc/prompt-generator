/**
 * XSS Prevention - Content Sanitization Utility
 * Uses DOMPurify to sanitize user-generated content before rendering
 */

// Check if DOMPurify is loaded
if (typeof DOMPurify === 'undefined') {
  console.error('DOMPurify is not loaded. Please include DOMPurify before this script.');
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} dirty - Potentially unsafe HTML content
 * @param {Object} options - DOMPurify configuration options
 * @returns {string} - Sanitized HTML
 */
function sanitizeHTML(dirty, options = {}) {
  if (typeof DOMPurify === 'undefined') {
    // Fallback: escape HTML if DOMPurify not available
    console.warn('DOMPurify not available, using basic HTML escaping');
    const div = document.createElement('div');
    div.textContent = dirty;
    return div.innerHTML;
  }

  // Default DOMPurify configuration
  const defaultOptions = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true
  };

  const config = { ...defaultOptions, ...options };
  return DOMPurify.sanitize(dirty, config);
}

/**
 * Sanitize text content (strips all HTML)
 * @param {string} text - Text that may contain HTML
 * @returns {string} - Plain text
 */
function sanitizeText(text) {
  if (typeof DOMPurify === 'undefined') {
    // Fallback: basic escaping
    const div = document.createElement('div');
    div.textContent = text;
    return div.textContent;
  }
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}

/**
 * Safely set innerHTML with sanitization
 * @param {HTMLElement} element - DOM element to update
 * @param {string} content - Content to set (will be sanitized)
 * @param {Object} options - DOMPurify options
 */
function safeSetInnerHTML(element, content, options = {}) {
  if (!element) {
    console.error('Element is null or undefined');
    return;
  }
  element.innerHTML = sanitizeHTML(content, options);
}

/**
 * Safely set textContent (preferred over innerHTML when possible)
 * @param {HTMLElement} element - DOM element to update
 * @param {string} text - Text content to set
 */
function safeSetTextContent(element, text) {
  if (!element) {
    console.error('Element is null or undefined');
    return;
  }
  element.textContent = sanitizeText(text);
}

// Export functions for use in other scripts
window.sanitizeHTML = sanitizeHTML;
window.sanitizeText = sanitizeText;
window.safeSetInnerHTML = safeSetInnerHTML;
window.safeSetTextContent = safeSetTextContent;

