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
    const userId = req.session.userId;
    const companyId = parseInt(req.params.companyId);

    if (isNaN(companyId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid company ID'
      });
    }

    // Fetch company
    const company = await companyRepository.findById(companyId, userId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Fetch all communities for this company
    const communities = communityRepository.findByCompanyId(companyId, userId);

    if (!communities || communities.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No communities found for this company. Please add communities before generating a prompt.'
      });
    }

    try {
      // Log communities data for debugging
      logger.info('Generating prompt with data', { 
        userId, 
        companyId, 
        communitiesCount: communities.length,
        communitiesData: communities.map(c => ({
          id: c.id,
          name: c.name,
          ilec: c.ilec,
          clec: c.clec,
          technologiesCount: Array.isArray(c.technologies) ? c.technologies.length : 0,
          technologies: c.technologies
        }))
      });

      // Generate the prompt
      const prompt = generateCompanyPrompt(company, communities);

      logger.info('Company prompt generated', { userId, companyId });

      res.json({
        success: true,
        prompt
      });
    } catch (error) {
      logger.error('Error generating company prompt', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate prompt'
      });
    }
  })
);

module.exports = router;

