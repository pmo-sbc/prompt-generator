/**
 * Validation Schemas
 * Centralized validation rules using express-validator
 */

const { body, param } = require('express-validator');
const config = require('../config');

const validators = {
  // User Registration Validation
  register: [
    body('username')
      .trim()
      .isLength({
        min: config.validation.username.minLength,
        max: config.validation.username.maxLength
      })
      .withMessage(`Username must be ${config.validation.username.minLength}-${config.validation.username.maxLength} characters`)
      .isAlphanumeric()
      .withMessage('Username must contain only letters and numbers')
      .escape(),

    body('email')
      .trim()
      .isEmail()
      .withMessage('Must be a valid email address')
      .normalizeEmail()
      .isLength({ max: config.validation.email.maxLength })
      .withMessage('Email is too long'),

    body('password')
      .isLength({ min: config.validation.password.minLength })
      .withMessage(`Password must be at least ${config.validation.password.minLength} characters`)
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],

  // User Login Validation
  login: [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .escape(),

    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  // Save Prompt Validation
  savePrompt: [
    body('templateName')
      .trim()
      .notEmpty()
      .withMessage('Template name is required')
      .escape(),

    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required')
      .escape(),

    body('promptText')
      .trim()
      .notEmpty()
      .withMessage('Prompt text is required')
      .isLength({ max: config.validation.promptText.maxLength })
      .withMessage('Prompt text is too long'),

    body('inputs')
      .optional()
      .isObject()
      .withMessage('Inputs must be an object')
  ],

  // Track Usage Validation
  trackUsage: [
    body('templateName')
      .trim()
      .notEmpty()
      .withMessage('Template name is required')
      .escape(),

    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required')
      .escape()
  ],

  // Delete Prompt Validation
  deletePrompt: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid prompt ID')
      .toInt()
  ],

  // Search Prompts Validation
  searchPrompts: [
    body('searchTerm')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search term must be 1-100 characters')
      .escape()
  ],

  // Profile Management Validation
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),

    body('newPassword')
      .isLength({ min: config.validation.password.minLength })
      .withMessage(`New password must be at least ${config.validation.password.minLength} characters`)
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
      .custom((value, { req }) => {
        if (value === req.body.currentPassword) {
          throw new Error('New password must be different from current password');
        }
        return true;
      })
  ],

  updateEmail: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Must be a valid email address')
      .normalizeEmail()
      .isLength({ max: config.validation.email.maxLength })
      .withMessage('Email is too long'),

    body('password')
      .notEmpty()
      .withMessage('Password is required for email change')
  ],

  deleteAccount: [
    body('password')
      .notEmpty()
      .withMessage('Password is required to delete account')
  ],

  // Project Management Validation
  createProject: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Project name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Project name must be 1-100 characters')
      .escape(),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be 500 characters or less'),

    body('color')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex color (e.g., #3498db)')
  ],

  updateProject: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid project ID')
      .toInt(),

    body('name')
      .trim()
      .notEmpty()
      .withMessage('Project name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Project name must be 1-100 characters')
      .escape(),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be 500 characters or less'),

    body('color')
      .optional()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex color (e.g., #3498db)')
  ],

  deleteProject: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid project ID')
      .toInt()
  ],

  assignPromptToProject: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid project ID')
      .toInt(),

    param('promptId')
      .isInt({ min: 1 })
      .withMessage('Invalid prompt ID')
      .toInt()
  ],

  // Template Management Validation
  saveTemplate: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Template name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Template name must be 1-100 characters')
      .escape(),

    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required')
      .isLength({ min: 1, max: 50 })
      .withMessage('Category must be 1-50 characters')
      .escape(),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be 500 characters or less')
  ],

  // User Management Validation (Admin)
  toggleAdmin: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid user ID')
      .toInt()
  ],

  deleteUser: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid user ID')
      .toInt()
  ],

  // Token Management Validation
  adjustTokens: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid user ID')
      .toInt(),

    body('tokens')
      .isInt({ min: 0, max: 1000000 })
      .withMessage('Tokens must be between 0 and 1,000,000')
      .toInt()
  ],

  // Email Validation
  emailToken: [
    body('token')
      .trim()
      .notEmpty()
      .withMessage('Token is required')
      .isLength({ min: 32, max: 128 })
      .withMessage('Invalid token format')
      .matches(/^[a-f0-9]+$/i)
      .withMessage('Token must be hexadecimal')
  ],

  forgotPassword: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Must be a valid email address')
      .normalizeEmail()
  ],

  resetPassword: [
    body('token')
      .trim()
      .notEmpty()
      .withMessage('Reset token is required')
      .isLength({ min: 32, max: 128 })
      .withMessage('Invalid token format')
      .matches(/^[a-f0-9]+$/i)
      .withMessage('Token must be hexadecimal'),

    body('password')
      .isLength({ min: config.validation.password.minLength })
      .withMessage(`Password must be at least ${config.validation.password.minLength} characters`)
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],

  // Bulk Operations Validation
  bulkAssignPrompts: [
    body('promptIds')
      .isArray({ min: 1 })
      .withMessage('Must provide at least one prompt ID'),

    body('promptIds.*')
      .isInt({ min: 1 })
      .withMessage('All prompt IDs must be valid integers')
      .toInt(),

    body('projectId')
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage('Project ID must be a valid integer')
      .toInt()
  ],

  bulkDeletePrompts: [
    body('promptIds')
      .isArray({ min: 1 })
      .withMessage('Must provide at least one prompt ID'),

    body('promptIds.*')
      .isInt({ min: 1 })
      .withMessage('All prompt IDs must be valid integers')
      .toInt()
  ]
};

module.exports = validators;
