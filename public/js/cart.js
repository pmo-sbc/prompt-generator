/**
 * Shopping Cart Management
 * Handles cart operations with user-specific storage
 * - Logged-in users: localStorage with user ID key
 * - Guest users: sessionStorage (temporary, cleared on browser close)
 */

// Get current user ID from localStorage
function getCurrentUserId() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        // Check both 'id' and 'userId' for compatibility
        return user.id || user.userId || null;
    } catch (error) {
        return null;
    }
}

// Get the appropriate storage key for the current user
function getCartStorageKey() {
    const userId = getCurrentUserId();
    if (userId) {
        // Logged-in user: use localStorage with user-specific key
        return `shopping_cart_user_${userId}`;
    } else {
        // Guest user: use sessionStorage
        return 'shopping_cart_guest';
    }
}

// Get the appropriate storage object (localStorage or sessionStorage)
function getCartStorage() {
    const userId = getCurrentUserId();
    if (userId) {
        // Logged-in user: use localStorage (persists across sessions)
        return localStorage;
    } else {
        // Guest user: use sessionStorage (cleared when browser closes)
        return sessionStorage;
    }
}

/**
 * Get cart from appropriate storage
 */
function getCart() {
    try {
        const storage = getCartStorage();
        const storageKey = getCartStorageKey();
        const cartJson = storage.getItem(storageKey);
        return cartJson ? JSON.parse(cartJson) : [];
    } catch (error) {
        console.error('Error reading cart from storage:', error);
        return [];
    }
}

/**
 * Save cart to appropriate storage
 */
function saveCart(cart) {
    try {
        const storage = getCartStorage();
        const storageKey = getCartStorageKey();
        storage.setItem(storageKey, JSON.stringify(cart));
        return true;
    } catch (error) {
        console.error('Error saving cart to storage:', error);
        return false;
    }
}

/**
 * Switch cart when user logs in or out
 * This preserves the guest cart when logging in, and clears it when logging out
 */
function switchCartOnAuthChange() {
    const userId = getCurrentUserId();
    const oldGuestCartKey = 'shopping_cart_guest';
    
    if (userId) {
        // User just logged in - merge guest cart with user cart if needed
        const guestCart = sessionStorage.getItem(oldGuestCartKey);
        if (guestCart) {
            try {
                const guestCartItems = JSON.parse(guestCart);
                const userCart = getCart();
                
                // Merge guest cart items into user cart
                guestCartItems.forEach(guestItem => {
                    const existingItemIndex = userCart.findIndex(item => item.id === guestItem.id);
                    if (existingItemIndex !== -1) {
                        // Item exists, update quantity (add guest quantity to user quantity)
                        userCart[existingItemIndex].quantity = (userCart[existingItemIndex].quantity || 1) + (guestItem.quantity || 1);
                    } else {
                        // New item, add it
                        userCart.push(guestItem);
                    }
                });
                
                // Save merged cart
                saveCart(userCart);
                
                // Clear guest cart
                sessionStorage.removeItem(oldGuestCartKey);
                
                // Update cart count
                updateCartCount();
                
                console.log('Cart merged from guest to user account');
            } catch (error) {
                console.error('Error merging guest cart:', error);
            }
        }
    } else {
        // User just logged out - clear user cart from localStorage
        // Keep guest cart in sessionStorage if it exists
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
            if (key.startsWith('shopping_cart_user_')) {
                localStorage.removeItem(key);
            }
        });
        
        // Update cart count
        updateCartCount();
        
        console.log('User cart cleared on logout');
    }
}

/**
 * Add item to cart
 */
function addItemToCart(item) {
    const cart = getCart();
    
    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);
    
    if (existingItemIndex !== -1) {
        // Update quantity if item exists
        cart[existingItemIndex].quantity = (cart[existingItemIndex].quantity || 1) + 1;
    } else {
        // Add new item
        cart.push({
            ...item,
            quantity: item.quantity || 1
        });
    }
    
    saveCart(cart);
    updateCartCount();
    return cart;
}

/**
 * Remove item from cart
 */
function removeItemFromCart(itemId) {
    const cart = getCart();
    const filteredCart = cart.filter(item => item.id !== itemId);
    saveCart(filteredCart);
    updateCartCount();
    return filteredCart;
}

/**
 * Update item quantity in cart
 */
function updateItemQuantity(itemId, quantity) {
    const cart = getCart();
    const itemIndex = cart.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        if (quantity <= 0) {
            // Remove item if quantity is 0 or less
            return removeItemFromCart(itemId);
        } else {
            cart[itemIndex].quantity = quantity;
            saveCart(cart);
            updateCartCount();
        }
    }
    
    return cart;
}

/**
 * Clear entire cart
 */
function clearCart() {
    const storage = getCartStorage();
    const storageKey = getCartStorageKey();
    storage.removeItem(storageKey);
    updateCartCount();
    return [];
}

/**
 * Get total number of items in cart
 */
function getCartItemCount() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (item.quantity || 1), 0);
}

/**
 * Get cart total price
 */
function getCartTotal() {
    const cart = getCart();
    return cart.reduce((total, item) => {
        const itemPrice = item.finalPrice !== undefined ? item.finalPrice : item.price;
        return total + (itemPrice * (item.quantity || 1));
    }, 0);
}

/**
 * Get cart subtotal (before discounts)
 */
function getCartSubtotal() {
    const cart = getCart();
    return cart.reduce((total, item) => {
        return total + (item.price * (item.quantity || 1));
    }, 0);
}

/**
 * Get total discount amount
 */
function getCartDiscount() {
    const cart = getCart();
    return cart.reduce((total, item) => {
        if (item.discountApplied && item.finalPrice !== undefined) {
            const discount = (item.price * (item.quantity || 1)) - (item.finalPrice * (item.quantity || 1));
            return total + discount;
        }
        return total;
    }, 0);
}

/**
 * Update cart count in navigation
 * @param {boolean} skipEvent - If true, skip dispatching cartUpdated event (prevents recursion)
 */
function updateCartCount(skipEvent = false) {
    const count = getCartItemCount();
    const cartLink = document.getElementById('cartLink');
    const cartCount = document.getElementById('cartCount');
    
    if (cartLink && cartCount) {
        // Always show cart link on all pages (never hide it)
        // Remove any inline display style that might hide it
        // Note: cartLink is the <li> element, don't modify parent (nav-menu) display
        cartLink.style.display = '';
        cartCount.textContent = count;
    } else if (cartCount) {
        // Update count even if link element structure is different
        cartCount.textContent = count;
    }
    
    // If cart link doesn't exist, try to add it via auth.js function
    if (!cartLink && typeof addCartLinkToNav === 'function') {
        addCartLinkToNav();
        // Try again after adding
        const newCartLink = document.getElementById('cartLink');
        const newCartCount = document.getElementById('cartCount');
        if (newCartLink && newCartCount) {
            newCartLink.style.display = '';
            newCartCount.textContent = count;
        }
    }
    
    // Dispatch custom event for other components to listen (unless skipped to prevent recursion)
    if (!skipEvent) {
        window.dispatchEvent(new CustomEvent('cartUpdated', { 
            detail: { count, cart: getCart() } 
        }));
    }
}

// Initialize cart count on page load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        updateCartCount();
        // Check for auth changes and switch cart if needed
        switchCartOnAuthChange();
    });
    updateCartCount();
    
    // Listen for auth state changes
    window.addEventListener('storage', (e) => {
        // When localStorage changes (like user login/logout), switch cart
        if (e.key === 'user' || e.key === 'authToken') {
            switchCartOnAuthChange();
            updateCartCount();
        }
    });
    
    // Listen for custom auth events
    window.addEventListener('userLoggedIn', () => {
        switchCartOnAuthChange();
        updateCartCount();
    });
    
    window.addEventListener('userLoggedOut', () => {
        switchCartOnAuthChange();
        updateCartCount();
    });
    
    // Also check on auth check (when auth.js runs)
    // This handles cases where auth state changes without storage events
    const originalCheckAuth = window.checkAuth;
    if (originalCheckAuth) {
        // Wrap checkAuth to also switch cart
        window.checkAuth = function() {
            const result = originalCheckAuth.apply(this, arguments);
            setTimeout(() => {
                switchCartOnAuthChange();
                updateCartCount();
            }, 100);
            return result;
        };
    }
}

// Export functions globally for use in other scripts
if (typeof window !== 'undefined') {
    window.getCart = getCart;
    window.saveCart = saveCart;
    window.addItemToCart = addItemToCart;
    window.removeItemFromCart = removeItemFromCart;
    window.updateItemQuantity = updateItemQuantity;
    window.clearCart = clearCart;
    window.getCartItemCount = getCartItemCount;
    window.getCartTotal = getCartTotal;
    window.getCartSubtotal = getCartSubtotal;
    window.getCartDiscount = getCartDiscount;
    window.updateCartCount = updateCartCount;
    window.switchCartOnAuthChange = switchCartOnAuthChange;
}

// Also export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getCart,
        saveCart,
        addItemToCart,
        removeItemFromCart,
        updateItemQuantity,
        clearCart,
        getCartItemCount,
        getCartTotal,
        getCartSubtotal,
        getCartDiscount,
        updateCartCount,
        switchCartOnAuthChange
    };
}

