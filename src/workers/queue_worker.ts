import { Worker, Job } from 'bullmq';
import { NotificationUtil, EmailJobData } from '@/utils/notification_util';
import { redisConnection } from '@/utils/redis';

export class QueueWorker {
  private static emailWorker: Worker<EmailJobData>;

  public static init(): void {
    // BullMQ uses redisConnection directly inside the Worker constructor
  }

  public static beginProcessing(): void {
    if (QueueWorker.emailWorker) {
      return;
    }

    console.log('[QueueWorker] Starting email queue processing...');

    QueueWorker.emailWorker = new Worker<EmailJobData>(
      'emailQueue',
      async (job: Job<EmailJobData>) => {
        const { to, subject, body } = job.data;
        const sent = await NotificationUtil.sendEmail(to, subject, body);

        if (!sent) {
          throw new Error(`Failed delivery attempt for recipient: ${to}`);
        }
        console.log(`[QueueWorker] Email successfully dispatched to: ${to}`);
      },
      {
        connection: redisConnection,
      }
    );

    QueueWorker.emailWorker.on('completed', (job: Job<EmailJobData>) => {
      console.log(`[QueueWorker] Job ${job.id} completed successfully.`);
    });

    QueueWorker.emailWorker.on(
      'failed',
      (job: Job<EmailJobData> | undefined, err: Error) => {
        if (!job) return;

        const maxAttempts = job.opts.attempts || 1;
        if (job.attemptsMade >= maxAttempts) {
          console.error(
            `[QueueWorker] Permanent failure for job ${job.id} (Recipient: ${job.data.to}): ${err.message}`
          );
        } else {
          console.warn(
            `[QueueWorker] Retrying job ${job.id} (Attempt ${job.attemptsMade}/${maxAttempts})...`
          );
        }
      }
    );
  }
}
