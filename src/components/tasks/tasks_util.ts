import { NotificationUtil } from '@/utils/notification_util';
import { UsersUtil } from '@/components/users/users_utils';

export type TaskAction = 'add' | 'update' | 'delete';

export class TaskUtil {
  public static async notifyUsers(
    projectUserIds: string[],
    taskName: string,
    action: TaskAction
  ): Promise<void> {
    if (!projectUserIds || projectUserIds.length === 0) return;

    let subject = '';
    let body = '';

    switch (action) {
      case 'add':
        subject = 'New Task Created';
        body = `<p>A new task <strong>${taskName}</strong> has been created in your project.</p>`;
        break;
      case 'update':
        subject = 'Task Updated';
        body = `<p>The task <strong>${taskName}</strong> has been updated.</p>`;
        break;
      case 'delete':
        subject = 'Task Removed';
        body = `<p>The task <strong>${taskName}</strong> was removed from your project.</p>`;
        break;
    }

    for (const userId of projectUserIds) {
      const user = await UsersUtil.getUserById(userId);
      if (user && user.email) {
        await NotificationUtil.enqueueEmail(user.email, subject, body);
      }
    }
  }
}
