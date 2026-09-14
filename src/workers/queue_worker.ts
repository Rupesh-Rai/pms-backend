import Queue from 'bull';
import { NotificationUtil, EmailJobData } from '@/utils/notification_util';

export class QueueWorker {
  private static emailQueue: Queue.Queue<EmailJobData>;
  private static MAX_ATTEMPTS = 4;

  public static init(redisUrl?: string): void {
    const connectionUrl =
      redisUrl ||
      `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
    QueueWorker.emailQueue = new Queue<EmailJobData>(
      'emailQueue',
      connectionUrl
    );
  }

  public static beginProcessing(): void {
    if (!QueueWorker.emailQueue) {
      throw new Error(
        'QueueWorker not initialized. Call QueueWorker.init() first.'
      );
    }

    console.log('[QueueWorker] Starting email queue processing...');

    QueueWorker.emailQueue.process(async (job) => {
      const { to, subject, body } = job.data;
      const sent = await NotificationUtil.sendEmail(to, subject, body);

      if (!sent) {
        throw new Error(`Failed delivery attempt for recipient: ${to}`);
      }
      console.log(`[QueueWorker] Email successfully dispatched to: ${to}`);
    });

    QueueWorker.emailQueue.on('failed', async (job, err) => {
      if (job.attemptsMade >= QueueWorker.MAX_ATTEMPTS) {
        console.error(
          `[QueueWorker] Permanent failure for job ${job.id} (Recipient: ${job.data.to}): ${err.message}`
        );
      } else {
        console.warn(
          `[QueueWorker] Retrying job ${job.id} (Attempt ${job.attemptsMade}/${QueueWorker.MAX_ATTEMPTS})...`
        );
        await job.retry();
      }
    });
  }
}
