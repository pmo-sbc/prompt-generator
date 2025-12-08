/**
 * Company Routes
 */

const express = require('express');
const companyRepository = require('../db/companyRepository');
const { requireAuth } = require('../middleware/auth');
const { configureCsrf } = require('../middleware/security');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const path = require('path');

const router = express.Router();
const csrfProtection = configureCsrf();

/**
 * GET /companies
 * Serve company profiles page
 */
router.get('/companies', requireAuth, csrfProtection, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'companies.html'));
});

/**
 * GET /api/companies
 * Get all companies for the current user
 */
router.get(
  '/api/companies',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    try {
      const companies = await companyRepository.findByUserId(userId);
      res.json({
        success: true,
        companies: companies || []
      });
    } catch (error) {
      logger.error('Error fetching companies', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch companies'
      });
    }
  })
);

/**
 * GET /api/companies/:id
 * Get a single company by ID
 */
router.get(
  '/api/companies/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const companyId = parseInt(req.params.id);

    if (isNaN(companyId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid company ID'
      });
    }

    try {
      const company = await companyRepository.findById(companyId, userId);
      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Company not found'
        });
      }

      res.json({
        success: true,
        company
      });
    } catch (error) {
      logger.error('Error fetching company', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch company'
      });
    }
  })
);

/**
 * POST /api/companies
 * Create a new company
 */
router.post(
  '/api/companies',
  requireAuth,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { name, legalName = null, marketingName = null } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    try {
      const legalNameValue = (legalName && typeof legalName === 'string') ? legalName.trim() : null;
      const marketingNameValue = (marketingName && typeof marketingName === 'string') ? marketingName.trim() : null;
      
      const company = await companyRepository.create(
        userId, 
        name.trim(),
        legalNameValue || null,
        marketingNameValue || null
      );
      logger.info('Company created', { userId, companyId: company.id });
      
      res.json({
        success: true,
        company
      });
    } catch (error) {
      logger.error('Error creating company', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create company'
      });
    }
  })
);

/**
 * PUT /api/companies/:id
 * Update a company
 */
router.put(
  '/api/companies/:id',
  requireAuth,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const companyId = parseInt(req.params.id);
    const { name, legalName = null, marketingName = null } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    if (isNaN(companyId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid company ID'
      });
    }

    // Verify company belongs to user
    const company = companyRepository.findById(companyId, userId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    try {
      const legalNameValue = (legalName && typeof legalName === 'string') ? legalName.trim() : null;
      const marketingNameValue = (marketingName && typeof marketingName === 'string') ? marketingName.trim() : null;
      
      const updated = await companyRepository.update(
        companyId, 
        userId, 
        name.trim(),
        legalNameValue || null,
        marketingNameValue || null
      );
      if (!updated) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update company'
        });
      }

      logger.info('Company updated', { userId, companyId });
      
      res.json({
        success: true,
        message: 'Company updated successfully'
      });
    } catch (error) {
      logger.error('Error updating company', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update company'
      });
    }
  })
);

/**
 * DELETE /api/companies/:id
 * Delete a company
 */
router.delete(
  '/api/companies/:id',
  requireAuth,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const companyId = parseInt(req.params.id);

    if (isNaN(companyId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid company ID'
      });
    }

    // Verify company belongs to user
    const company = companyRepository.findById(companyId, userId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    try {
      const deleted = await companyRepository.delete(companyId, userId);
      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: 'Failed to delete company'
        });
      }

      logger.info('Company deleted', { userId, companyId });
      
      res.json({
        success: true,
        message: 'Company deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting company', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete company'
      });
    }
  })
);

module.exports = router;

