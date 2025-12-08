/**
 * Community Routes
 */

const express = require('express');
const communityRepository = require('../db/communityRepository');
const { requireAuth } = require('../middleware/auth');
const { configureCsrf } = require('../middleware/security');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();
const csrfProtection = configureCsrf();

/**
 * GET /api/companies/:companyId/communities
 * Get all communities for a specific company
 */
router.get(
  '/api/companies/:companyId/communities',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const companyId = parseInt(req.params.companyId);

    if (isNaN(companyId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid company ID'
      });
    }

    // Verify company belongs to user
    if (!(await communityRepository.verifyCompanyOwnership(companyId, userId))) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    try {
      const communities = await communityRepository.findByCompanyId(companyId, userId);
      res.json({
        success: true,
        communities: communities || []
      });
    } catch (error) {
      logger.error('Error fetching communities', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch communities'
      });
    }
  })
);

/**
 * POST /api/companies/:companyId/communities
 * Create a new community for a company
 */
router.post(
  '/api/companies/:companyId/communities',
  requireAuth,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const companyId = parseInt(req.params.companyId);
    const { 
      name, 
      ilec = false, 
      clec = false, 
      servingCompanyName = null,
      technologies = [] 
    } = req.body;

    if (isNaN(companyId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid company ID'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Community name is required'
      });
    }

    // Validate technologies array
    if (!Array.isArray(technologies)) {
      return res.status(400).json({
        success: false,
        error: 'Technologies must be an array'
      });
    }

    // Verify company belongs to user
    if (!(await communityRepository.verifyCompanyOwnership(companyId, userId))) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    try {
      const community = await communityRepository.create(
        companyId, 
        name.trim(),
        !!ilec,
        !!clec,
        servingCompanyName ? servingCompanyName.trim() : null,
        technologies
      );
      logger.info('Community created', { userId, companyId, communityId: community.id });
      
      res.json({
        success: true,
        community
      });
    } catch (error) {
      logger.error('Error creating community', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create community'
      });
    }
  })
);

/**
 * GET /api/communities/:id
 * Get a single community by ID
 */
router.get(
  '/api/communities/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const communityId = parseInt(req.params.id);

    if (isNaN(communityId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid community ID'
      });
    }

    try {
      const community = await communityRepository.findById(communityId, userId);
      if (!community) {
        return res.status(404).json({
          success: false,
          error: 'Community not found'
        });
      }

      res.json({
        success: true,
        community
      });
    } catch (error) {
      logger.error('Error fetching community', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch community'
      });
    }
  })
);

/**
 * PUT /api/communities/:id
 * Update a community
 */
router.put(
  '/api/communities/:id',
  requireAuth,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const communityId = parseInt(req.params.id);
    const { 
      name, 
      ilec = false, 
      clec = false, 
      servingCompanyName = null,
      technologies = [] 
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Community name is required'
      });
    }

    if (isNaN(communityId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid community ID'
      });
    }

    // Validate technologies array
    if (!Array.isArray(technologies)) {
      return res.status(400).json({
        success: false,
        error: 'Technologies must be an array'
      });
    }

    // Verify community belongs to user
    const community = communityRepository.findById(communityId, userId);
    if (!community) {
      return res.status(404).json({
        success: false,
        error: 'Community not found'
      });
    }

    try {
      const updated = await communityRepository.update(
        communityId, 
        userId, 
        name.trim(),
        !!ilec,
        !!clec,
        servingCompanyName ? servingCompanyName.trim() : null,
        technologies
      );
      if (!updated) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update community'
        });
      }

      logger.info('Community updated', { userId, communityId });
      
      res.json({
        success: true,
        message: 'Community updated successfully'
      });
    } catch (error) {
      logger.error('Error updating community', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update community'
      });
    }
  })
);

/**
 * DELETE /api/communities/:id
 * Delete a community
 */
router.delete(
  '/api/communities/:id',
  requireAuth,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const communityId = parseInt(req.params.id);

    if (isNaN(communityId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid community ID'
      });
    }

    // Verify community belongs to user
    const community = communityRepository.findById(communityId, userId);
    if (!community) {
      return res.status(404).json({
        success: false,
        error: 'Community not found'
      });
    }

    try {
      const deleted = await communityRepository.delete(communityId, userId);
      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: 'Failed to delete community'
        });
      }

      logger.info('Community deleted', { userId, communityId });
      
      res.json({
        success: true,
        message: 'Community deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting community', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete community'
      });
    }
  })
);

module.exports = router;

