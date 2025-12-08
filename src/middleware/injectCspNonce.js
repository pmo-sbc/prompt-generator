/**
 * CSP Nonce Injection Middleware
 * Injects CSP nonce into inline scripts in HTML files
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Inject CSP nonce into HTML content
 * @param {string} htmlContent - Original HTML content
 * @param {string} nonce - CSP nonce value
 * @returns {string} - HTML with nonce injected
 */
function injectNonceIntoHTML(htmlContent, nonce) {
  if (!nonce) {
    return htmlContent;
  }

  // Inject nonce into inline <script> tags (without src attribute)
  // Match all script tags, then filter out those with src or type="application/ld+json"
  const scriptTagRegex = /<script\s*([^>]*)>/gi;
  
  let modifiedHTML = htmlContent.replace(scriptTagRegex, (match, attributes) => {
    const trimmedAttrs = attributes ? attributes.trim() : '';
    
    // Skip external scripts (those with src attribute)
    if (trimmedAttrs && /src\s*=/i.test(trimmedAttrs)) {
      return match;
    }
    
    // Skip JSON-LD scripts (they don't need nonces, they're data not executable code)
    if (trimmedAttrs && /type\s*=\s*["']application\/ld\+json["']/i.test(trimmedAttrs)) {
      return match;
    }
    
    // This is an inline script - add or update nonce
    // Check if nonce already exists
    if (trimmedAttrs && /nonce\s*=/i.test(trimmedAttrs)) {
      // Replace existing nonce
      return match.replace(/nonce\s*=\s*["'][^"']*["']/i, `nonce="${nonce}"`);
    }
    
    // Add nonce attribute
    if (trimmedAttrs) {
      // Has other attributes, add nonce with space
      return `<script ${trimmedAttrs} nonce="${nonce}">`;
    }
    // No attributes, just add nonce
    return `<script nonce="${nonce}">`;
  });

  // Also inject into inline <style> tags if needed
  const styleTagRegex = /<style(?![^>]*\ssrc=)([^>]*)>/gi;
  modifiedHTML = modifiedHTML.replace(styleTagRegex, (match, attributes) => {
    if (attributes && attributes.includes('nonce=')) {
      return match.replace(/nonce="[^"]*"/, `nonce="${nonce}"`);
    }
    if (attributes && attributes.trim()) {
      return `<style${attributes} nonce="${nonce}">`;
    }
    return `<style nonce="${nonce}">`;
  });

  return modifiedHTML;
}

/**
 * Middleware to inject CSP nonce into HTML responses
 */
function injectCspNonceMiddleware(req, res, next) {
  const originalSendFile = res.sendFile;
  
  res.sendFile = function(filePath, options, callback) {
    // Handle callback as second parameter (Express.js pattern)
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    
    // Only process HTML files
    if (typeof filePath === 'string' && filePath.endsWith('.html')) {
      const nonce = res.locals.cspNonce;
      
      logger.debug('CSP nonce injection middleware triggered', {
        file: filePath,
        hasNonce: !!nonce,
        nonce: nonce ? nonce.substring(0, 8) + '...' : 'none'
      });
      
      if (nonce) {
        try {
          // Determine the full path
          let fullPath;
          if (path.isAbsolute(filePath)) {
            // Already absolute, use as-is
            fullPath = path.normalize(filePath);
          } else if (options && options.root) {
            // If root is provided in options, use it
            fullPath = path.join(options.root, filePath);
          } else {
            // Default to resolving from current working directory
            fullPath = path.resolve(filePath);
          }
          
          // Normalize the path to handle .. and . segments
          fullPath = path.normalize(fullPath);
          
          // Check if file exists
          if (!fs.existsSync(fullPath)) {
            // Try alternative path resolution for routes using path.join(__dirname, ...)
            const altPath = path.join(__dirname, '../../', filePath.replace(/^.*public[\/\\]/, 'public/'));
            if (fs.existsSync(altPath)) {
              fullPath = altPath;
              logger.debug('Found file using alternative path resolution', {
                original: filePath,
                resolved: fullPath
              });
            } else {
              logger.warn('HTML file not found for nonce injection', { 
                file: fullPath,
                altPath: altPath,
                originalPath: filePath,
                cwd: process.cwd(),
                __dirname: __dirname
              });
              return originalSendFile.call(this, filePath, options, callback);
            }
          }
          
          // Read the HTML file
          let htmlContent = fs.readFileSync(fullPath, 'utf8');
          
          // Inject nonce into inline scripts
          const beforeInjection = htmlContent;
          htmlContent = injectNonceIntoHTML(htmlContent, nonce);
          
          // Verify injection worked by checking if nonces were added
          const nonceCount = (htmlContent.match(new RegExp(`nonce="${nonce}"`, 'g')) || []).length;
          const inlineScriptCount = (beforeInjection.match(/<script(?![^>]*\ssrc\s*=)(?![^>]*type\s*=\s*["']application\/ld\+json["'])([^>]*)>/gi) || []).length;
          
          logger.info('CSP nonce injection completed', {
            file: path.basename(fullPath),
            nonce: nonce.substring(0, 8) + '...',
            inlineScriptsFound: inlineScriptCount,
            noncesInjected: nonceCount,
            success: nonceCount >= inlineScriptCount
          });
          
          if (nonceCount < inlineScriptCount) {
            logger.warn('Some inline scripts may not have received nonces', {
              file: path.basename(fullPath),
              expected: inlineScriptCount,
              actual: nonceCount
            });
          }
          
          // Send modified content
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.send(htmlContent);
        } catch (error) {
          logger.error('Error injecting CSP nonce into HTML', {
            file: filePath,
            error: error.message,
            stack: error.stack
          });
          // Fall back to original sendFile if injection fails
          return originalSendFile.call(this, filePath, options, callback);
        }
      } else {
        logger.warn('No CSP nonce available for HTML file', { file: filePath });
      }
    }
    
    // For non-HTML files, use original sendFile
    return originalSendFile.call(this, filePath, options, callback);
  };
  
  next();
}

module.exports = injectCspNonceMiddleware;

