/**
 * CSRF Protection Helper
 * Automatically includes CSRF token in all POST, PUT, DELETE, PATCH requests
 */

// Get CSRF token from cookie
function getCsrfToken() {
    const name = 'XSRF-TOKEN=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    
    for (let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i].trim();
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length, cookie.length);
        }
    }
    return null;
}

// Enhanced fetch wrapper that automatically includes CSRF token
window.fetchWithCsrf = async function(url, options = {}) {
    // Only add CSRF token for state-changing methods
    const methodsRequiringCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'];
    const method = (options.method || 'GET').toUpperCase();
    
    if (methodsRequiringCsrf.includes(method)) {
        const csrfToken = getCsrfToken();
        
        if (csrfToken) {
            // Add CSRF token to headers
            options.headers = {
                ...options.headers,
                'X-CSRF-Token': csrfToken
            };
        }
    }
    
    // Make the request
    return fetch(url, options);
};

// Optional: Override the global fetch to automatically use CSRF
// Uncomment the lines below to make all fetch calls CSRF-protected automatically
// const originalFetch = window.fetch;
// window.fetch = fetchWithCsrf;
