import nodemailer from 'nodemailer';
import { config } from '@/utils/config';

// 1. Create Nodemailer Transporter instance
const transporter = nodemailer.createTransport({
  host: config.email_config.host,
  port: config.email_config.port,
  secure: config.email_config.port === 465, // true for port 465, false for other ports
  auth: {
    user: config.email_config.user,
    pass: config.email_config.password,
  },
});

export interface ISendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Utility function to send emails (e.g., password reset, notifications).
 */
export const sendEmail = async (
  options: ISendEmailOptions
): Promise<boolean> => {
  try {
    const mailOptions = {
      from: config.email_config.from || config.email_config.user,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`Failed to send email: ${error?.message || error}`);
    return false;
  }
};
