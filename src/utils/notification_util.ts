import nodemailer, { Transporter } from 'nodemailer';
import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

export class NotificationUtil {
  private static transporter: Transporter;
  private static from: string;
  public static emailQueue: Queue<EmailJobData>;

  public static init(config: {
    user: string;
    pass: string;
    from: string;
  }): void {
    NotificationUtil.from = config.from;

    if (!NotificationUtil.transporter) {
      NotificationUtil.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });
    }

    if (!NotificationUtil.emailQueue) {
      NotificationUtil.emailQueue = new Queue<EmailJobData>('emailQueue', {
        connection: redisConnection,
      });
    }
  }

  public static async sendEmail(
    to: string,
    subject: string,
    body: string
  ): Promise<string | boolean> {
    try {
      const mailOptions = {
        from: NotificationUtil.from,
        to,
        subject,
        html: body,
      };

      const status = await NotificationUtil.transporter.sendMail(mailOptions);
      return status?.messageId || false;
    } catch (error: any) {
      console.error(`Error in sendEmail: ${error?.message || error}`);
      return false;
    }
  }

  public static async enqueueEmail(
    to: string,
    subject: string,
    body: string
  ): Promise<void> {
    if (!NotificationUtil.emailQueue) {
      throw new Error(
        'NotificationUtil is not initialized. Call NotificationUtil.init() first.'
      );
    }

    // BullMQ handles attempts and exponential backoff configuration directly on job addition
    await NotificationUtil.emailQueue.add(
      'sendEmail',
      { to, subject, body },
      {
        attempts: 4,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
  }
}
