/**
 * Prompt Generator Routes
 * API routes for generating company/community descriptions
 */

const express = require('express');
const companyRepository = require('../db/companyRepository');
const communityRepository = require('../db/communityRepository');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateCompanyPrompt } = require('../utils/promptGenerator');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/generate-company-prompt/:companyId
 * Generate a prompt/description for a company based on its communities
 */
router.post(
  '/api/generate-company-prompt/:companyId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.session?.userId;
    const companyId = parseInt(req.params.companyId);

    if (!userId) {
      logger.error('No user ID in session', { session: req.session });
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (isNaN(companyId)) {
      logger.warn('Invalid company ID provided', { companyId: req.params.companyId });
      return res.status(400).json({
        success: false,
        error: 'Invalid company ID'
      });
    }

    try {
      // Fetch company
      logger.info('Fetching company', { userId, companyId });
      const company = await companyRepository.findById(companyId, userId);
      if (!company) {
        logger.warn('Company not found', { userId, companyId });
        return res.status(404).json({
          success: false,
          error: 'Company not found'
        });
      }

      // Fetch all communities for this company
      logger.info('Fetching communities', { userId, companyId });
      let communities;
      try {
        communities = await communityRepository.findByCompanyId(companyId, userId);
      } catch (error) {
        logger.error('Error fetching communities from repository', {
          error: error.message,
          stack: error.stack,
          userId,
          companyId
        });
        throw error;
      }

      // Ensure communities is always an array - defensive check
      const communitiesArray = Array.isArray(communities) ? communities : [];
      
      // Log what we received for debugging
      if (!Array.isArray(communities)) {
        logger.error('Communities is not an array', {
          userId,
          companyId,
          type: typeof communities,
          isArray: Array.isArray(communities),
          value: communities
        });
      }
      
      if (communitiesArray.length === 0) {
        logger.warn('No communities found for company', { userId, companyId });
        return res.status(400).json({
          success: false,
          error: 'No communities found for this company. Please add communities before generating a prompt.'
        });
      }

      // Log communities data for debugging
      logger.info('Generating prompt with data', { 
        userId, 
        companyId, 
        communitiesCount: communitiesArray.length,
        communitiesData: communitiesArray.map(c => ({
          id: c.id,
          name: c.name,
          ilec: c.ilec,
          clec: c.clec,
          technologiesCount: Array.isArray(c.technologies) ? c.technologies.length : 0,
          technologies: c.technologies
        }))
      });

      // Generate the prompt
      logger.info('Calling generateCompanyPrompt', { userId, companyId });
      const prompt = generateCompanyPrompt(company, communitiesArray);

      logger.info('Company prompt generated successfully', { userId, companyId, promptLength: prompt?.length });

      res.json({
        success: true,
        prompt
      });
    } catch (error) {
      logger.error('Error generating company prompt', { 
        error: error.message, 
        stack: error.stack,
        userId, 
        companyId 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to generate prompt',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  })
);

module.exports = router;

