import nodemailer, { Transporter } from 'nodemailer';
import Queue from 'bull';

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

export class NotificationUtil {
  private static transporter: Transporter;
  private static from: string;
  public static emailQueue: Queue.Queue<EmailJobData>;

  public static init(config: {
    user: string;
    pass: string;
    from: string;
    redisUrl?: string;
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
      const redisHost = process.env.REDIS_HOST || '127.0.0.1';
      const redisPort = Number(process.env.REDIS_PORT) || 6379;

      // Passing options object directly avoids string parsing issues with Bull
      NotificationUtil.emailQueue = new Queue<EmailJobData>('emailQueue', {
        redis: {
          host: redisHost,
          port: redisPort,
        },
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
    await NotificationUtil.emailQueue.add({ to, subject, body });
  }
}
