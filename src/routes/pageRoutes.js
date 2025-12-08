/**
 * Page Routes
 * Routes for serving HTML pages
 */

const express = require('express');
const path = require('path');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /
 * Home page or dashboard if logged in
 */
router.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.sendFile(path.join(__dirname, '../../public', 'index.html'));
  }
});

/**
 * GET /dashboard
 * User dashboard (protected)
 */
router.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'dashboard.html'));
});

/**
 * GET /templates
 * Templates page (requires course purchase)
 */
const requireCourseAccess = require('../middleware/requireCourseAccess');
router.get('/templates', requireAuth, requireCourseAccess, (req, res) => {
  // If we reach here, user has course access (middleware verified it)
  // Pass access status via data attribute on body tag (doesn't require JavaScript)
  const htmlPath = path.join(__dirname, '../../public', 'templates.html');
  const fs = require('fs');
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  // Add data attribute to body tag to indicate course access
  // This way client-side JS can check it even if CSP blocks other scripts
  htmlContent = htmlContent.replace(
    /<body([^>]*)>/i,
    '<body$1 data-course-access="true">'
  );
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(htmlContent);
});

/**
 * GET /about
 * About page
 */
router.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'about.html'));
});

/**
 * GET /product
 * Product page
 */
router.get('/product', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'product.html'));
});

/**
 * GET /cart
 * Shopping cart page
 */
router.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'cart.html'));
});

/**
 * GET /courses
 * Courses page (requires authentication)
 */
router.get('/courses', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'courses.html'));
});

/**
 * GET /checkout
 * Checkout page (requires authentication)
 */
router.get('/checkout', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'checkout.html'));
});

/**
 * GET /order-success
 * Order confirmation success page
 */
router.get('/order-success', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'order-success.html'));
});

/**
 * GET /admin-analytics
 * Admin analytics dashboard (protected)
 */
router.get('/admin-analytics', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'admin-analytics.html'));
});

/**
 * GET /admin/products
 * Admin product management page (protected, admin only)
 */
router.get('/admin/products', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'admin-products.html'));
});

module.exports = router;
