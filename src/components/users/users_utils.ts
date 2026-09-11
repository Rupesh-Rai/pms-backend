import { UsersService } from '@/components/users/users_service';

export class UsersUtil {
  public static async getUserFromUsername(username: string) {
    try {
      if (username) {
        const service = await UsersService.createInstance();
        // Queries database for the given username
        const result = await service.findAll({
          username: username.toLowerCase(),
        });
        if (result.data && result.data.length > 0) {
          return result.data[0];
        }
      }
    } catch (error: any) {
      console.error(
        `Error in UsersUtil.getUserFromUsername: ${error?.message || error}`
      );
    }
    return null;
  }

  public static async getUserByEmail(email: string) {
    try {
      if (email) {
        const service = await UsersService.createInstance();
        const users = await service.customQuery(`email = '${email}'`);

        if (users && users.length > 0) {
          return users[0];
        }
      }
    } catch (error: any) {
      console.error(
        `Error while getUserFromToken() => ${error?.message || error}`
      );
    }
    return null;
  }

  /**
   * Verifies whether all provided user_ids exist in the database.
   * @param {string[]} user_ids - Array of UUIDs to validate
   * @returns {Promise<boolean>} True if all user IDs exist, false otherwise
   */
  public static async checkValidUserIds(user_ids: string[]): Promise<boolean> {
    try {
      if (!user_ids || user_ids.length === 0) return false;

      const userService = await UsersService.createInstance();
      const users = await userService.findByIds(user_ids);

      return users?.data?.length === user_ids.length;
    } catch (error: any) {
      console.error(
        `Error in UsersUtil.checkValidUserIds: ${error?.message || error}`
      );
      return false;
    }
  }
}
