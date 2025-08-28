import express from 'express';
import { validate, schemas } from '../middleware/validation.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';
import Communication from '../models/Communication.js';
import User from '../models/User.js';
import nodemailer from 'nodemailer';

const router = express.Router();

const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

router.post('/', 
  validate(schemas.contact), 
  catchAsync(async (req, res) => {
    const { name, email, phone, subject, message } = req.body;

    // Find a hotel admin to use as the system sender
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      throw new AppError('System configuration error', 500);
    }

    // Save the contact message to database
    const communication = await Communication.create({
      hotelId: adminUser.hotelId || adminUser._id, // Use admin user ID if no hotel ID
      sentBy: adminUser._id,
      recipients: [{
        userId: adminUser._id,
        email: adminUser.email,
        status: 'sent',
        sentAt: new Date()
      }],
      subject: `Contact Form: ${subject}`,
      content: `
Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}

Message:
${message}
      `,
      type: 'email',
      status: 'sent',
      priority: 'normal',
      category: 'operational'
    });

    // Send email notification if email service is configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = createEmailTransporter();
        
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: process.env.EMAIL_USER, // Send to admin email
          subject: `New Contact Form Submission: ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">New Contact Form Submission</h2>
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #1e40af;">Contact Information</h3>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                <p><strong>Subject:</strong> ${subject}</p>
              </div>
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px;">
                <h3 style="margin: 0 0 15px 0; color: #1e40af;">Message</h3>
                <p style="line-height: 1.6;">${message}</p>
              </div>
              <div style="margin-top: 20px; padding: 15px; background-color: #dbeafe; border-radius: 8px;">
                <p style="margin: 0; font-size: 14px; color: #1e40af;">
                  This message was sent through the Pentouz Hotel Management contact form.
                </p>
              </div>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't throw error - the contact form submission should still succeed
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Thank you for your message. We will get back to you soon!',
      data: {
        id: communication._id
      }
    });
  })
);

export default router;