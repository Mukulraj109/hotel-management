import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Check if SMTP credentials are provided
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        logger.warn('SMTP credentials not provided. Email functionality will be disabled.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates for development
        }
      });

      logger.info('Email transporter initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
    }
  }

  async verifyConnection() {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }

    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully');
      return true;
    } catch (error) {
      logger.error('SMTP connection verification failed:', error);
      throw error;
    }
  }

  async sendEmail({ to, subject, text, html, from }) {
    if (!this.transporter) {
      logger.warn('Email transporter not available. Email not sent.');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: from || `"The Pentouz Hotels" <${process.env.SMTP_USER}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text,
        html
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Email sent successfully to ${to}`, {
        messageId: result.messageId,
        subject
      });

      return {
        success: true,
        messageId: result.messageId,
        response: result.response
      };
    } catch (error) {
      logger.error('Failed to send email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendContactFormNotification(contactData, recipients) {
    const { name, email, phone, subject, message } = contactData;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="margin: 0; font-size: 24px;">New Contact Form Submission</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">From The Pentouz Website</p>
        </div>
        
        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; padding: 30px;">
          <div style="margin-bottom: 25px;">
            <h3 style="color: #333; margin-bottom: 15px; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">Guest Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555; width: 100px;">Name:</td>
                <td style="padding: 8px 0; color: #333;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Email:</td>
                <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #667eea; text-decoration: none;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Phone:</td>
                <td style="padding: 8px 0; color: #333;">${phone || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Subject:</td>
                <td style="padding: 8px 0; color: #333;">${subject}</td>
              </tr>
            </table>
          </div>
          
          <div>
            <h3 style="color: #333; margin-bottom: 15px; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">Message</h3>
            <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; border-radius: 0 5px 5px 0; line-height: 1.6; color: #333;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
            <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
              Please respond directly to the guest at: <strong>${email}</strong>
            </p>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 5px; display: inline-block;">
              <strong>The Pentouz Contact Form</strong><br>
              <small>Automated notification system</small>
            </div>
          </div>
        </div>
      </div>
    `;

    const textContent = `
New contact form submission from The Pentouz website:

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Subject: ${subject}

Message:
${message}

---
Please respond directly to the guest at: ${email}
This is an automated message from The Pentouz contact form.
    `.trim();

    const recipientEmails = recipients.map(recipient => recipient.email);

    return await this.sendEmail({
      to: recipientEmails,
      subject: `Contact Form: ${subject}`,
      text: textContent,
      html: htmlContent
    });
  }

  async sendWelcomeEmail(user) {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Welcome to The Pentouz!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Your luxury hospitality experience begins here</p>
        </div>
        
        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; padding: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">Dear ${user.name},</p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Thank you for joining The Pentouz family! We're thrilled to have you as part of our exclusive community.
          </p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 25px; margin: 25px 0;">
            <h3 style="color: #333; margin-bottom: 15px;">Your Account Details:</h3>
            <p style="margin: 5px 0; color: #555;"><strong>Name:</strong> ${user.name}</p>
            <p style="margin: 5px 0; color: #555;"><strong>Email:</strong> ${user.email}</p>
            <p style="margin: 5px 0; color: #555;"><strong>Loyalty Tier:</strong> ${user.loyalty?.tier || 'Bronze'}</p>
            <p style="margin: 5px 0; color: #555;"><strong>Member Since:</strong> ${new Date().toLocaleDateString()}</p>
          </div>

          <div style="margin: 25px 0;">
            <h3 style="color: #333; margin-bottom: 15px;">Member Benefits:</h3>
            <ul style="color: #555; line-height: 1.8;">
              <li>Exclusive member rates and seasonal discounts</li>
              <li>Priority booking and complimentary room upgrades</li>
              <li>Loyalty points on every stay</li>
              <li>Access to member-only events and experiences</li>
              <li>24/7 concierge support</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/login" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      display: inline-block;">
              Start Exploring
            </a>
          </div>

          <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 25px;">
            If you have any questions or need assistance, please don't hesitate to contact us at 
            <a href="mailto:sales@pentouz.com" style="color: #667eea;">sales@pentouz.com</a> 
            or call us at +91 8884449930.
          </p>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              The Pentouz Hotels & Resorts<br>
              46, 6th Cross, Lavelle Road, Bangalore - 560001, India
            </p>
          </div>
        </div>
      </div>
    `;

    const textContent = `
Welcome to The Pentouz!

Dear ${user.name},

Thank you for joining The Pentouz family! We're thrilled to have you as part of our exclusive community.

Your Account Details:
- Name: ${user.name}
- Email: ${user.email}
- Loyalty Tier: ${user.loyalty?.tier || 'Bronze'}
- Member Since: ${new Date().toLocaleDateString()}

Member Benefits:
- Exclusive member rates and seasonal discounts
- Priority booking and complimentary room upgrades
- Loyalty points on every stay
- Access to member-only events and experiences
- 24/7 concierge support

Visit our website to start exploring: http://localhost:3000/login

If you have any questions, contact us at sales@pentouz.com or +91 8884449930.

Best regards,
The Pentouz Hotels & Resorts
46, 6th Cross, Lavelle Road, Bangalore - 560001, India
    `;

    return await this.sendEmail({
      to: user.email,
      subject: 'Welcome to The Pentouz - Your Luxury Journey Begins!',
      text: textContent,
      html: htmlContent
    });
  }
}

export default new EmailService();