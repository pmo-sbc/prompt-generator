/**
 * Generate Prompt Routes
 * Handles prompt generation with token deduction
 */

const express = require('express');
const userRepository = require('../db/userRepository');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { configureCsrf } = require('../middleware/security');
const logger = require('../utils/logger');

const router = express.Router();
const csrfProtection = configureCsrf();

/**
 * POST /api/generate-prompt
 * Generate a prompt and deduct tokens
 */
router.post(
  '/generate-prompt',
  requireAuth,
  csrfProtection,
  [
    body('isPremium')
      .isBoolean()
      .withMessage('isPremium must be a boolean'),
    body('templateName')
      .trim()
      .notEmpty()
      .withMessage('Template name is required')
  ],
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { isPremium, templateName } = req.body;
    const userId = req.session.userId;

    // Determine token cost
    const tokenCost = isPremium ? 5 : 1;

    // Check if user has enough tokens
    const currentTokens = userRepository.getTokens(userId);

    if (currentTokens < tokenCost) {
      logger.warn('Insufficient tokens', {
        userId,
        required: tokenCost,
        available: currentTokens
      });

      return res.status(402).json({
        error: 'Insufficient tokens',
        message: `You need ${tokenCost} token${tokenCost > 1 ? 's' : ''} to generate this prompt. You have ${currentTokens} token${currentTokens !== 1 ? 's' : ''} remaining.`,
        tokensRequired: tokenCost,
        tokensAvailable: currentTokens
      });
    }

    // Deduct tokens
    const success = userRepository.deductTokens(userId, tokenCost);

    if (!success) {
      logger.error('Failed to deduct tokens', { userId, tokenCost });
      return res.status(500).json({
        error: 'Failed to process token deduction',
        message: 'An error occurred while processing your request. Please try again.'
      });
    }

    // Get new token balance
    const newBalance = userRepository.getTokens(userId);

    logger.info('Tokens deducted for prompt generation', {
      userId,
      templateName,
      isPremium,
      tokenCost,
      oldBalance: currentTokens,
      newBalance
    });

    res.json({
      success: true,
      tokensDeducted: tokenCost,
      remainingTokens: newBalance,
      message: `${tokenCost} token${tokenCost > 1 ? 's' : ''} deducted successfully`
    });
  })
);

/**
 * GET /api/tokens
 * Get user's current token balance
 */
router.get(
  '/tokens',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const tokens = userRepository.getTokens(userId);

    res.json({
      tokens: tokens
    });
  })
);

module.exports = router;
