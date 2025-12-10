/**
 * Email Service
 * Handles all email sending functionality
 * Supports both Zapier webhook and SMTP based on environment configuration
 */

const axios = require('axios');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;
    this.zapierSecret = process.env.ZAPIER_SECRET;
    this.transporter = null;
    this.from = process.env.EMAIL_FROM || 'AI Prompt Templates <noreply@example.com>';
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.emailMode = null;
    
    this.initializeEmailService();
  }

  /**
   * Initialize email service - checks for SMTP first, then Zapier
   * This prioritizes SMTP for production environments
   */
  initializeEmailService() {
    // Priority 1: Check for SMTP configuration first (for production)
    this.initializeTransporter();
    
    if (this.transporter) {
      this.emailMode = 'smtp';
      logger.info('Email service initialized with SMTP', {
        mode: 'smtp',
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT
      });
      return;
    }

    // Priority 2: Check for Zapier webhook (for local/development)
    if (this.zapierWebhookUrl) {
      this.emailMode = 'zapier';
      logger.info('Email service initialized with Zapier', {
        webhookConfigured: true,
        mode: 'zapier'
      });
      return;
    }

    // No email service configured
    this.emailMode = 'none';
    logger.warn('No email service configured. Emails will be logged instead of sent.', {
      mode: 'none',
      hasZapier: !!this.zapierWebhookUrl,
      hasSMTP: !!(process.env.SMTP_HOST && process.env.SMTP_PORT),
      hasEmailService: !!(process.env.EMAIL_SERVICE && process.env.EMAIL_USER)
    });
  }

  /**
   * Initialize SMTP transporter
   */
  initializeTransporter() {
    // Check if SMTP is configured with custom server
    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
      try {
        const config = {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER || process.env.EMAIL_USER,
            pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD
          }
        };

        // Add TLS options if specified
        if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false') {
          config.tls = {
            rejectUnauthorized: false
          };
        }

        this.transporter = nodemailer.createTransport(config);

        logger.info('Custom SMTP server initialized', {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: config.secure,
          user: config.auth.user
        });
        return;
      } catch (error) {
        logger.error('Failed to initialize custom SMTP server', error);
        this.transporter = null;
        return;
      }
    }

    // Check if email service is configured (Gmail, SendGrid, etc.)
    if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER) {
      try {
        this.transporter = nodemailer.createTransport({
          service: process.env.EMAIL_SERVICE,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });

        logger.info('Email service initialized', {
          service: process.env.EMAIL_SERVICE,
          user: process.env.EMAIL_USER
        });
        return;
      } catch (error) {
        logger.error('Failed to initialize email service', error);
        this.transporter = null;
        return;
      }
    }

    this.transporter = null;
  }

  /**
   * Send email - routes to Zapier or SMTP based on configuration
   */
  async sendEmail(to, subject, html) {
    // Route to appropriate service
    if (this.emailMode === 'zapier') {
      return await this.sendEmailViaZapier(to, subject, html);
    } else if (this.emailMode === 'smtp') {
      return await this.sendEmailViaSMTP(to, subject, html);
    } else {
      // No email service configured - just log
      logger.info('EMAIL (not sent - no email service configured)', {
        to,
        subject,
        html: html.substring(0, 200) + '...',
        mode: this.emailMode
      });
      return { success: true, message: 'Email logged (no service configured)' };
    }
  }

  /**
   * Send email via Zapier webhook
   */
  async sendEmailViaZapier(to, subject, html) {
    if (!this.zapierWebhookUrl) {
      logger.warn('Zapier webhook URL not configured', {
        to,
        subject
      });
      return { success: false, message: 'Zapier webhook not configured' };
    }

    try {
      // Prepare payload for Zapier
      const payload = {
        to_email: to,
        from_email: this.from,
        subject: subject,
        html_body: html,
        timestamp: new Date().toISOString()
      };

      // Add secret if configured (for webhook security)
      if (this.zapierSecret) {
        payload.secret = this.zapierSecret;
      }

      // Send to Zapier webhook
      const response = await axios.post(this.zapierWebhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      logger.info('Email sent via Zapier successfully', {
        to,
        subject,
        status: response.status,
        zapierResponse: response.data
      });

      return {
        success: true,
        messageId: response.data?.id || `zapier-${Date.now()}`,
        zapierStatus: response.data?.status
      };
    } catch (error) {
      logger.error('Failed to send email via Zapier', {
        error: error.message,
        to,
        subject,
        webhookUrl: this.zapierWebhookUrl,
        statusCode: error.response?.status,
        responseData: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Send email via SMTP
   */
  async sendEmailViaSMTP(to, subject, html) {
    if (!this.transporter) {
      logger.warn('SMTP transporter not configured', {
        to,
        subject
      });
      return { success: false, message: 'SMTP transporter not configured' };
    }

    try {
      // Log email details before sending
      logger.info('Sending email via SMTP', {
        from: this.from,
        to,
        subject,
        transporterConfigured: !!this.transporter
      });

      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html
      });

      logger.info('Email sent successfully via SMTP', {
        to,
        from: this.from,
        subject,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        responseCode: info.responseCode,
        envelope: info.envelope
      });

      // Check if email was actually accepted
      if (info.rejected && info.rejected.length > 0) {
        logger.warn('Email was rejected by SMTP server', {
          to,
          subject,
          rejected: info.rejected,
          accepted: info.accepted
        });
        throw new Error(`Email rejected by SMTP server: ${info.rejected.join(', ')}`);
      }

      if (!info.accepted || info.accepted.length === 0) {
        logger.warn('Email was not accepted by SMTP server', {
          to,
          subject,
          accepted: info.accepted,
          rejected: info.rejected
        });
        throw new Error('Email was not accepted by SMTP server');
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send email via SMTP', {
        error: error.message,
        errorCode: error.code,
        to,
        from: this.from,
        subject,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        errno: error.errno,
        syscall: error.syscall,
        hostname: error.hostname,
        port: error.port,
        address: error.address,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(email, username, verificationToken) {
    const verificationUrl = `${this.baseUrl}/verify-email?token=${verificationToken}`;

    const subject = 'Verify Your Email - AI Prompt Templates';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            margin-top: 20px;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #667eea;
          }
          .logo {
            width: 60px;
            height: 60px;
            background: #667eea;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: white;
            margin-bottom: 10px;
          }
          h1 {
            color: #667eea;
            margin: 10px 0;
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffecb5;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">AI</div>
            <h1>Welcome to AI Prompt Templates!</h1>
          </div>

          <p>Hi ${username},</p>

          <p>Thank you for creating an account with AI Prompt Templates. To get started, please verify your email address by clicking the button below:</p>

          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </div>

          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>

          <div class="warning">
            <strong>Note:</strong> This verification link will expire in 24 hours. If you didn't create this account, you can safely ignore this email.
          </div>

          <p>Once verified, you'll have full access to:</p>
          <ul>
            <li>49+ professional prompt blueprints</li>
            <li>Save and manage your favorite templates</li>
            <li>Track your prompt usage</li>
            <li>Generate AI-ready prompts instantly</li>
          </ul>

          <p>Happy prompting!</p>
          <p><strong>The AI Prompt Templates Team</strong></p>

          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>AI Prompt Templates - Professional AI Prompt Generation</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(email, username) {
    const subject = 'Welcome to AI Prompt Templates! 🎉';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            margin-top: 20px;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
          }
          .logo {
            width: 60px;
            height: 60px;
            background: #667eea;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: white;
            margin-bottom: 10px;
          }
          h1 {
            color: #667eea;
            margin: 10px 0;
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
          }
          .feature-box {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            border-left: 4px solid #667eea;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">AI</div>
            <h1>You're All Set, ${username}! 🎉</h1>
          </div>

          <p>Your email has been verified and your account is now fully activated!</p>

          <div style="text-align: center;">
            <a href="${this.baseUrl}/templates" class="button">Start Creating Prompts</a>
          </div>

          <h2>Quick Start Guide:</h2>

          <div class="feature-box">
            <strong>1. Explore the Prompt Studio</strong><br>
            Browse 49+ professional blueprints across Marketing, Development, Content Writing, Business, and Education.
          </div>

          <div class="feature-box">
            <strong>2. Customize Your Prompts</strong><br>
            Select a blueprint, fill in your parameters, and adjust the tone and style to match your needs.
          </div>

          <div class="feature-box">
            <strong>3. Generate & Use</strong><br>
            Generate your prompt and send it directly to ChatGPT, Claude, Gemini, or any AI platform.
          </div>

          <div class="feature-box">
            <strong>4. Save Favorites</strong><br>
            Bookmark templates you use frequently for quick access later.
          </div>

          <p>Need help? Have questions? Just reply to this email - we're here to help!</p>

          <p>Happy prompting!</p>
          <p><strong>The AI Prompt Templates Team</strong></p>

          <div class="footer">
            <p>AI Prompt Templates - Professional AI Prompt Generation</p>
            <p><a href="${this.baseUrl}" style="color: #667eea;">Visit Dashboard</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, username, resetToken) {
    const resetUrl = `${this.baseUrl}/reset-password?token=${resetToken}`;

    const subject = 'Password Reset Request - AI Prompt Templates';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            margin-top: 20px;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #e74c3c;
          }
          .logo {
            width: 60px;
            height: 60px;
            background: #e74c3c;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: white;
            margin-bottom: 10px;
          }
          h1 {
            color: #e74c3c;
            margin: 10px 0;
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background: #e74c3c;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffecb5;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔒</div>
            <h1>Password Reset Request</h1>
          </div>

          <p>Hi ${username},</p>

          <p>We received a request to reset your password for your AI Prompt Templates account. Click the button below to create a new password:</p>

          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>

          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #e74c3c;">${resetUrl}</p>

          <div class="warning">
            <strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
          </div>

          <p>For security reasons, we recommend choosing a strong password that:</p>
          <ul>
            <li>Is at least 8 characters long</li>
            <li>Contains uppercase and lowercase letters</li>
            <li>Includes at least one number</li>
            <li>Is unique to this account</li>
          </ul>

          <p>Stay safe!</p>
          <p><strong>The AI Prompt Templates Team</strong></p>

          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>AI Prompt Templates - Professional AI Prompt Generation</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(email, customerName, orderData) {
    const subject = 'Order Confirmation - AI Prompt Templates';

    // Get product details to check for courses
    const productRepository = require('../db/productRepository');
    const allProducts = await productRepository.findAll(true); // Include inactive for lookup
    const productsMap = new Map(allProducts.map(p => [p.id, p]));

    // Find courses in the order
    const coursesInOrder = [];
    orderData.items.forEach(item => {
      const product = productsMap.get(item.id);
      if (product && (product.is_course === 1 || product.is_course === true)) {
        coursesInOrder.push({
          name: product.name,
          course_date: product.course_date,
          course_zoom_link: product.course_zoom_link
        });
      }
    });

    // Format order items
    const orderItemsHtml = orderData.items.map(item => {
      const itemTotal = (item.finalPrice !== undefined ? item.finalPrice : item.price) * (item.quantity || 1);
      const product = productsMap.get(item.id);
      const isCourse = product && (product.is_course === 1 || product.is_course === true);
      return `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 15px; text-align: left;">
            <strong>${item.name}</strong>
            ${isCourse ? ' <span style="background: #3498db; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; font-weight: 600;">📚 Course</span>' : ''}
            <br>
            <span style="color: #666; font-size: 0.9em;">Quantity: ${item.quantity || 1} × ${this.formatCurrency(item.price)}</span>
          </td>
          <td style="padding: 15px; text-align: right; font-weight: 600;">
            ${this.formatCurrency(itemTotal)}
          </td>
        </tr>
      `;
    }).join('');

    // Build course information section
    let courseSectionHtml = '';
    if (coursesInOrder.length > 0) {
      const coursesPageUrl = `${this.baseUrl}/courses`;
      const courseDetailsHtml = coursesInOrder.map(course => {
        let courseInfo = '';
        
        if (course.course_date) {
          const courseDate = new Date(course.course_date);
          const courseDateStr = courseDate.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
          });
          courseInfo += `
            <div style="margin: 10px 0;">
              <strong>📅 Course Date & Time:</strong><br>
              <span style="color: #2c5aa0; font-size: 1.1em;">${courseDateStr}</span>
            </div>
          `;
        }
        
        if (course.course_zoom_link) {
          courseInfo += `
            <div style="margin: 10px 0;">
              <strong>🔗 Zoom Meeting Link:</strong><br>
              <a href="${course.course_zoom_link}" style="color: #3498db; text-decoration: none; word-break: break-all; font-size: 1.1em;">${course.course_zoom_link}</a>
            </div>
          `;
        }
        
        return `
          <div style="background: #e3f2fd; border-left: 4px solid #3498db; padding: 15px; margin: 15px 0; border-radius: 5px;">
            <h3 style="margin: 0 0 10px 0; color: #2c5aa0;">${course.name}</h3>
            ${courseInfo}
          </div>
        `;
      }).join('');

      courseSectionHtml = `
        <div style="background: #f0f7ff; border: 2px solid #3498db; border-radius: 8px; padding: 20px; margin: 30px 0;">
          <h2 style="color: #2c5aa0; margin-top: 0; display: flex; align-items: center; gap: 10px;">
            📚 Course Access Information
          </h2>
          <p style="margin-bottom: 15px;">Great news! You've purchased course(s) in this order. Here are the details:</p>
          ${courseDetailsHtml}
          <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #b3d9ff;">
            <a href="${coursesPageUrl}" style="display: inline-block; padding: 12px 30px; background: #3498db; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 1.1em;">
              View All My Courses →
            </a>
          </div>
          <p style="margin-top: 15px; margin-bottom: 0; font-size: 0.9em; color: #666;">
            You can also access all your courses anytime by visiting your <a href="${coursesPageUrl}" style="color: #3498db;">Courses page</a>.
          </p>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            margin-top: 20px;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #2ecc71;
          }
          .logo {
            width: 60px;
            height: 60px;
            background: #2ecc71;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: white;
            margin-bottom: 10px;
          }
          h1 {
            color: #2ecc71;
            margin: 10px 0;
          }
          .success-badge {
            background: #e8f5e9;
            border: 1px solid #c8e6c9;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
            color: #2e7d32;
            font-weight: 600;
          }
          .order-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
          }
          .order-table th {
            background: #f5f5f5;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #e0e0e0;
          }
          .order-summary {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .summary-row.total {
            font-size: 1.3em;
            font-weight: 700;
            color: #2ecc71;
            border-top: 2px solid #2ecc71;
            margin-top: 10px;
            padding-top: 15px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">✓</div>
            <h1>Order Confirmation</h1>
          </div>

          <p>Hi ${customerName},</p>

          <div class="success-badge">
            🎉 Your payment was successful! Thank you for your purchase.
          </div>

          <p>We're excited to confirm your order. Here's what you've purchased:</p>

          <table class="order-table">
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${orderItemsHtml}
            </tbody>
          </table>

          <div class="order-summary">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>${this.formatCurrency(orderData.subtotal || 0)}</span>
            </div>
            ${orderData.discount && orderData.discount > 0 ? `
            <div class="summary-row">
              <span>Discount:</span>
              <span>-${this.formatCurrency(orderData.discount)}</span>
            </div>
            ` : ''}
            <div class="summary-row total">
              <span>Total Paid:</span>
              <span>${this.formatCurrency(orderData.total || 0)}</span>
            </div>
          </div>

          ${courseSectionHtml}

          <p><strong>What's Next?</strong></p>
          <p>Your order is being processed and you'll receive your product details shortly. If you have any questions about your order, please don't hesitate to contact us.</p>

          <p>Thank you for choosing AI Prompt Templates!</p>
          <p><strong>The AI Prompt Templates Team</strong></p>

          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>AI Prompt Templates - Professional AI Prompt Generation</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  /**
   * Send approval notification email with approve/reject buttons
   */
  async sendApprovalNotificationEmail(notificationEmail, pendingUserData, approveToken, rejectToken) {
    if (!notificationEmail || !pendingUserData) {
      logger.error('sendApprovalNotificationEmail called with invalid parameters', {
        notificationEmail,
        pendingUserData
      });
      throw new Error('Notification email and pending user data are required');
    }

    logger.info('Preparing approval notification email', {
      service: 'ai-prompt-templates',
      notificationEmail,
      pendingUserId: pendingUserData.id,
      username: pendingUserData.username,
      emailType: 'approval_notification',
      fromAddress: this.from,
      emailMode: this.emailMode
    });

    const approveUrl = `${this.baseUrl}/api/approve-user-by-email?token=${approveToken}`;
    const rejectUrl = `${this.baseUrl}/api/reject-user-by-email?token=${rejectToken}`;
    const adminUrl = `${this.baseUrl}/admin/approve-users`;

    const subject = '⚠️ New User Pending Approval - Action Required';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            margin-top: 20px;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #f39c12;
          }
          h1 {
            color: #f39c12;
            margin: 10px 0;
          }
          .info-box {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: 600;
            color: #666;
          }
          .value {
            color: #1a1a1a;
          }
          .action-buttons {
            text-align: center;
            margin: 30px 0;
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 10px;
            font-size: 1em;
          }
          .button-approve {
            margin-right: 25px;
          }
          .button-reject {
            margin-left: 25px;
          }
          .button-approve {
            background: #27ae60;
            color: white;
          }
          .button-reject {
            background: #e74c3c;
            color: white;
          }
          .button-approve:hover {
            background: #229954;
          }
          .button-reject:hover {
            background: #c0392b;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffecb5;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ New User Pending Approval</h1>
          </div>

          <p>A new user has registered and is waiting for approval:</p>

          <div class="info-box">
            <div class="info-row">
              <span class="label">Username:</span>
              <span class="value">${pendingUserData.username}</span>
            </div>
            <div class="info-row">
              <span class="label">Email:</span>
              <span class="value">${pendingUserData.email}</span>
            </div>
            <div class="info-row">
              <span class="label">Registration Date:</span>
              <span class="value">${new Date(pendingUserData.created_at).toLocaleString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}</span>
            </div>
          </div>

          <div class="action-buttons">
            <a href="${approveUrl}" class="button button-approve">✓ Approve User</a>
            <a href="${rejectUrl}" class="button button-reject">✗ Reject User</a>
          </div>

          <div class="warning">
            <strong>Quick Actions:</strong> Click the buttons above to approve or reject this user directly from this email. 
            Or visit the <a href="${adminUrl}" style="color: #856404; text-decoration: underline;">admin portal</a> to review additional details.
          </div>

          <p style="margin-top: 20px; color: #666; font-size: 0.9em;">
            <strong>Note:</strong> These links will expire in 7 days for security reasons.
          </p>

          <div class="footer">
            <p>This is an automated notification from the AI Prompt Templates system.</p>
            <p>AI Prompt Templates - Professional AI Prompt Generation</p>
          </div>
        </div>
      </body>
      </html>
    `;

    logger.info('Approval notification email template prepared, calling sendEmail', {
      notificationEmail,
      pendingUserId: pendingUserData.id,
      subject,
      from: this.from,
      emailLength: html.length,
      emailMode: this.emailMode
    });

    const result = await this.sendEmail(notificationEmail, subject, html);
    
    logger.info('Approval notification email sendEmail completed', {
      notificationEmail,
      pendingUserId: pendingUserData.id,
      result,
      emailMode: this.emailMode
    });
    
    return result;
  }

  /**
   * Send admin notification for new user registration
   */
  async sendNewUserNotification(userData) {
    const adminEmail = 'txrba.2025.training@3rdrockads.com';
    const subject = userData.isPending 
      ? '⚠️ New User Pending Approval - AI Prompt Templates'
      : 'New User Registration - AI Prompt Templates';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            margin-top: 20px;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #3498db;
          }
          h1 {
            color: #3498db;
            margin: 10px 0;
          }
          .info-box {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: 600;
            color: #666;
          }
          .value {
            color: #1a1a1a;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 New User Registration</h1>
          </div>

          <p>${userData.isPending ? 'A new user registration is pending approval on the AI Prompt Templates platform.' : 'A new user has registered on the AI Prompt Templates platform.'}</p>

          <div class="info-box">
            ${userData.isPending ? '<p style="background: #fff3cd; padding: 10px; border-radius: 4px; color: #856404; margin-bottom: 15px;"><strong>⚠️ Pending Approval:</strong> This user is pending approval and needs to be reviewed in the admin portal at <a href="' + this.baseUrl + '/admin/approve-users">' + this.baseUrl + '/admin/approve-users</a></p>' : ''}
            <div class="info-row">
              <span class="label">User ID:</span>
              <span class="value">${userData.id}</span>
            </div>
            <div class="info-row">
              <span class="label">Username:</span>
              <span class="value">${userData.username}</span>
            </div>
            <div class="info-row">
              <span class="label">Email:</span>
              <span class="value">${userData.email}</span>
            </div>
            <div class="info-row">
              <span class="label">Registration Date:</span>
              <span class="value">${new Date().toLocaleString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}</span>
            </div>
          </div>

          <p style="margin-top: 20px; color: #666; font-size: 0.9em;">
            This is an automated notification from the AI Prompt Templates system.
          </p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(adminEmail, subject, html);
  }

  /**
   * Send rejection email to user when their registration is rejected
   */
  async sendRejectionEmail(email, username) {
    if (!email || !username) {
      logger.error('sendRejectionEmail called with invalid parameters', {
        email,
        username
      });
      throw new Error('Email and username are required');
    }

    const subject = 'Account Registration - Action Required';

    logger.info('Preparing rejection email', {
      service: 'ai-prompt-templates',
      email,
      username,
      subject,
      emailType: 'rejection',
      fromAddress: this.from,
      emailMode: this.emailMode
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            margin-top: 20px;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #3498db;
          }
          .logo {
            width: 60px;
            height: 60px;
            background: #3498db;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: white;
            margin-bottom: 10px;
          }
          h1 {
            color: #3498db;
            margin: 10px 0;
            font-size: 1.8em;
          }
          .content {
            background: white;
            border-radius: 8px;
            padding: 25px;
            margin: 20px 0;
            line-height: 1.8;
          }
          .info-box {
            background: #e3f2fd;
            border-left: 4px solid #3498db;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
          }
          .info-box p {
            margin: 5px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .signature {
            margin-top: 25px;
            font-weight: 600;
            color: #2c3e50;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">TXRBA</div>
            <h1>Account Registration Update</h1>
          </div>

          <div class="content">
            <p>Dear ${username},</p>

            <p>Thank you for your interest in registering for the AI Prompt Templates service provided through the Texas Rural Broadband Association (TXRBA).</p>

            <p>We have reviewed your registration request and unfortunately, we are unable to approve your account at this time. This decision was made because we were unable to validate your information through TXRBA's verification process.</p>

            <div class="info-box">
              <p><strong>Next Steps:</strong></p>
              <p>To proceed with your registration, we kindly ask that you reach out to your TXRBA representative. They will be able to assist you with:</p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Verifying your eligibility for the service</li>
                <li>Confirming your information with TXRBA records</li>
                <li>Assisting with the registration process</li>
              </ul>
            </div>

            <p>Your TXRBA representative can help ensure that all necessary information is properly validated, which will allow us to complete your registration promptly.</p>

            <p>We appreciate your understanding and look forward to assisting you once your information has been validated through your TXRBA representative.</p>

            <p>If you have any questions or need further assistance, please don't hesitate to contact your TXRBA representative directly.</p>

            <div class="signature">
              <p>Best regards,</p>
              <p>The TXRBA Team</p>
              <p>Texas Rural Broadband Association</p>
            </div>
          </div>

          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>For assistance, please contact your TXRBA representative.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    logger.info('Rejection email template prepared, calling sendEmail', {
      email,
      username,
      subject,
      from: this.from,
      emailLength: html.length,
      emailMode: this.emailMode
    });

    const result = await this.sendEmail(email, subject, html);
    
    logger.info('Rejection email sendEmail completed', {
      email,
      username,
      result,
      emailMode: this.emailMode
    });
    
    return result;
  }

  /**
   * Send admin notification for user login
   */
  async sendUserLoginNotification(userData) {
    const adminEmail = 'txrba.2025.training@3rdrockads.com';
    const subject = 'User Login - AI Prompt Templates';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            margin-top: 20px;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #2ecc71;
          }
          h1 {
            color: #2ecc71;
            margin: 10px 0;
          }
          .info-box {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: 600;
            color: #666;
          }
          .value {
            color: #1a1a1a;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 User Login</h1>
          </div>

          <p>A user has logged into the AI Prompt Templates platform.</p>

          <div class="info-box">
            <div class="info-row">
              <span class="label">User ID:</span>
              <span class="value">${userData.id}</span>
            </div>
            <div class="info-row">
              <span class="label">Username:</span>
              <span class="value">${userData.username}</span>
            </div>
            <div class="info-row">
              <span class="label">Email:</span>
              <span class="value">${userData.email}</span>
            </div>
            <div class="info-row">
              <span class="label">Login Time:</span>
              <span class="value">${new Date().toLocaleString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}</span>
            </div>
          </div>

          <p style="margin-top: 20px; color: #666; font-size: 0.9em;">
            This is an automated notification from the AI Prompt Templates system.
          </p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(adminEmail, subject, html);
  }

  /**
   * Send admin notification for user purchase
   */
  async sendPurchaseNotification(orderData, userData) {
    const adminEmail = 'txrba.2025.training@3rdrockads.com';
    const subject = 'New Purchase - AI Prompt Templates';

    // Format order items
    const orderItemsHtml = orderData.items.map(item => {
      const itemTotal = (item.finalPrice !== undefined ? item.finalPrice : item.price) * (item.quantity || 1);
      return `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 10px; text-align: left;">${item.name}</td>
          <td style="padding: 10px; text-align: center;">${item.quantity || 1}</td>
          <td style="padding: 10px; text-align: right;">${this.formatCurrency(item.price)}</td>
          <td style="padding: 10px; text-align: right;">${this.formatCurrency(itemTotal)}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            margin-top: 20px;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #f39c12;
          }
          h1 {
            color: #f39c12;
            margin: 10px 0;
          }
          .info-box {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: 600;
            color: #666;
          }
          .value {
            color: #1a1a1a;
          }
          .order-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
          }
          .order-table th {
            background: #f5f5f5;
            padding: 10px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #e0e0e0;
          }
          .order-table td {
            padding: 10px;
          }
          .total-row {
            font-weight: 700;
            font-size: 1.2em;
            color: #f39c12;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 New Purchase</h1>
          </div>

          <p>A user has made a purchase on the AI Prompt Templates platform.</p>

          <div class="info-box">
            <h3 style="margin-top: 0;">Customer Information</h3>
            <div class="info-row">
              <span class="label">User ID:</span>
              <span class="value">${userData.id}</span>
            </div>
            <div class="info-row">
              <span class="label">Username:</span>
              <span class="value">${userData.username}</span>
            </div>
            <div class="info-row">
              <span class="label">Email:</span>
              <span class="value">${userData.email}</span>
            </div>
            <div class="info-row">
              <span class="label">Order Number:</span>
              <span class="value">${orderData.orderNumber || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Purchase Date:</span>
              <span class="value">${new Date().toLocaleString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}</span>
            </div>
          </div>

          <div class="info-box">
            <h3 style="margin-top: 0;">Order Details</h3>
            <table class="order-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${orderItemsHtml}
              </tbody>
            </table>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #e0e0e0;">
              <div class="info-row">
                <span class="label">Subtotal:</span>
                <span class="value">${this.formatCurrency(orderData.subtotal || 0)}</span>
              </div>
              ${orderData.discount && orderData.discount > 0 ? `
              <div class="info-row">
                <span class="label">Discount:</span>
                <span class="value">-${this.formatCurrency(orderData.discount)}</span>
              </div>
              ` : ''}
              <div class="info-row total-row">
                <span>Total:</span>
                <span>${this.formatCurrency(orderData.total || 0)}</span>
              </div>
            </div>
          </div>

          <p style="margin-top: 20px; color: #666; font-size: 0.9em;">
            This is an automated notification from the AI Prompt Templates system.
          </p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(adminEmail, subject, html);
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}

module.exports = new EmailService();
