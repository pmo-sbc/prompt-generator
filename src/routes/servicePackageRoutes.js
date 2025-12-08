/**
 * Service Package Routes
 */

const express = require('express');
const servicePackageRepository = require('../db/servicePackageRepository');
const { requireAuth } = require('../middleware/auth');
const { configureCsrf } = require('../middleware/security');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();
const csrfProtection = configureCsrf();

/**
 * GET /api/service-packages
 * Get all service packages for the current user
 */
router.get(
  '/api/service-packages',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;

    try {
      const servicePackages = await servicePackageRepository.findByUserId(userId);
      res.json({
        success: true,
        servicePackages: servicePackages || []
      });
    } catch (error) {
      logger.error('Error fetching service packages', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch service packages'
      });
    }
  })
);

/**
 * GET /api/service-packages/:id
 * Get a single service package by ID
 */
router.get(
  '/api/service-packages/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const servicePackageId = parseInt(req.params.id);

    if (isNaN(servicePackageId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid service package ID'
      });
    }

    try {
      const servicePackage = await servicePackageRepository.findById(servicePackageId, userId);
      if (!servicePackage) {
        return res.status(404).json({
          success: false,
          error: 'Service package not found'
        });
      }

      res.json({
        success: true,
        servicePackage
      });
    } catch (error) {
      logger.error('Error fetching service package', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch service package'
      });
    }
  })
);

/**
 * POST /api/service-packages
 * Create a new service package
 */
router.post(
  '/api/service-packages',
  requireAuth,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const { name, technologyType, licenseType, downloadSpeed, uploadSpeed } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Service package name is required'
      });
    }

    try {
      const servicePackage = await servicePackageRepository.create(
        userId,
        name.trim(),
        technologyType && technologyType.trim() ? technologyType.trim() : null,
        licenseType && licenseType.trim() ? licenseType.trim() : null,
        downloadSpeed || null,
        uploadSpeed || null
      );
      logger.info('Service package created', { userId, servicePackageId: servicePackage.id });
      
      res.json({
        success: true,
        servicePackage
      });
    } catch (error) {
      logger.error('Error creating service package', error);
      
      // Handle duplicate package error
      if (error.code === 'DUPLICATE_PACKAGE') {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to create service package'
      });
    }
  })
);

/**
 * PUT /api/service-packages/:id
 * Update a service package
 */
router.put(
  '/api/service-packages/:id',
  requireAuth,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const servicePackageId = parseInt(req.params.id);
    const { name, technologyType, licenseType, downloadSpeed, uploadSpeed, confirmTechnologyChange } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Service package name is required'
      });
    }

    if (isNaN(servicePackageId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid service package ID'
      });
    }

    // Verify service package belongs to user
    const servicePackage = servicePackageRepository.findById(servicePackageId, userId);
    if (!servicePackage) {
      return res.status(404).json({
        success: false,
        error: 'Service package not found'
      });
    }

    try {
      // Check if technology type is changing and if package is used in communities
      // Only check if not already confirmed
      if (!confirmTechnologyChange) {
        const oldTechnologyType = servicePackage.technology_type || null;
        const newTechnologyType = technologyType && technologyType.trim() ? technologyType.trim() : null;
        const isTechnologyChanging = oldTechnologyType !== newTechnologyType;

        if (isTechnologyChanging) {
          // Check if this package is used in any communities
          const usingCommunities = await servicePackageRepository.findCommunitiesUsingPackage(
            userId,
            servicePackage.name,
            servicePackage.download_speed || null,
            servicePackage.upload_speed || null
          );

          if (usingCommunities.length > 0) {
            return res.json({
              success: false,
              technologyChangeWarning: true,
              usingCommunities: usingCommunities,
              message: `This package is used in ${usingCommunities.length} community/communities. Changing the technology type will affect those communities as well.`
            });
          }
        }
      }

      const updated = await servicePackageRepository.update(
        servicePackageId,
        userId,
        name.trim(),
        technologyType && technologyType.trim() ? technologyType.trim() : null,
        licenseType && licenseType.trim() ? licenseType.trim() : null,
        downloadSpeed || null,
        uploadSpeed || null
      );
      if (!updated) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update service package'
        });
      }

      logger.info('Service package updated', { userId, servicePackageId });
      
      res.json({
        success: true,
        message: 'Service package updated successfully'
      });
    } catch (error) {
      logger.error('Error updating service package', error);
      
      // Handle duplicate package error
      if (error.code === 'DUPLICATE_PACKAGE') {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to update service package'
      });
    }
  })
);

/**
 * DELETE /api/service-packages/:id
 * Delete a service package
 */
router.delete(
  '/api/service-packages/:id',
  requireAuth,
  csrfProtection,
  asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    const servicePackageId = parseInt(req.params.id);

    if (isNaN(servicePackageId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid service package ID'
      });
    }

    // Verify service package belongs to user
    const servicePackage = servicePackageRepository.findById(servicePackageId, userId);
    if (!servicePackage) {
      return res.status(404).json({
        success: false,
        error: 'Service package not found'
      });
    }

    try {
      const deleted = await servicePackageRepository.delete(servicePackageId, userId);
      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: 'Failed to delete service package'
        });
      }

      logger.info('Service package deleted', { userId, servicePackageId });
      
      res.json({
        success: true,
        message: 'Service package deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting service package', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete service package'
      });
    }
  })
);

module.exports = router;
