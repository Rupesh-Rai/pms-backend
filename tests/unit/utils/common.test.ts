import { hasPermission, Rights } from '@/utils/common';

describe('Permission Logic (hasPermission)', () => {
  it('should return true when user possesses the requested permission right', () => {
    const userRights = [Rights.TASKS?.EDIT || 'edit_task', 'view_task'];
    const result = hasPermission(userRights, Rights.TASKS?.EDIT || 'edit_task');

    expect(result).toBe(true);
  });

  it('should return false when user lacks the requested permission right', () => {
    const userRights = ['view_task'];
    const result = hasPermission(
      userRights,
      Rights.TASKS?.DELETE || 'delete_task'
    );

    expect(result).toBe(false);
  });

  it('should safely return false if user rights are undefined or empty', () => {
    expect(hasPermission(undefined, 'edit_task')).toBe(false);
    expect(hasPermission([], 'edit_task')).toBe(false);
  });
});
