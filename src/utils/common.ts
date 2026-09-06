import * as bcrypt from 'bcrypt';

export const Rights = {
  ROLES: {
    ADD: 'add_role',
    EDIT: 'edit_role',
    GET_ALL: 'get_all_roles',
    GET_DETAILS: 'get_details_role',
    DELETE: 'delete_role',
    ALL: 'add_role,edit_role,get_all_roles,get_details_role,delete_role',
  },
  USERS: {
    ADD: 'add_user',
    EDIT: 'edit_user',
    GET_ALL: 'get_all_users',
    GET_DETAILS: 'get_details_user',
    DELETE: 'delete_user',
    ALL: 'add_user,edit_user,get_all_users,get_details_user,delete_user',
  },
  PROJECTS: {
    ADD: 'add_project',
    EDIT: 'edit_project',
    GET_ALL: 'get_all_projects',
    GET_DETAILS: 'get_details_project',
    DELETE: 'delete_project',
    ALL: 'add_project,edit_project,get_all_projects,get_details_project,delete_project',
  },
  TASKS: {
    ADD: 'add_task',
    EDIT: 'edit_task',
    GET_ALL: 'get_all_tasks',
    GET_DETAILS: 'get_details_task',
    DELETE: 'delete_task',
    ALL: 'add_task,edit_task,get_all_tasks,get_details_task,delete_task',
  },
  COMMENTS: {
    ADD: 'add_comment',
    EDIT: 'edit_comment',
    GET_ALL: 'get_all_comments',
    GET_DETAILS: 'get_details_comment',
    DELETE: 'delete_comment',
    ALL: 'add_comment,edit_comment,get_all_comments,get_details_comment,delete_comment',
  },
} as const;

/**
 * Encrypts a string using bcrypt hashing.
 *
 * @param {string} s - The string to be encrypted.
 * @returns {Promise<string>} - The encrypted string.
 */
export const encryptString = async (s: string): Promise<string> => {
  const saltRounds = 8;
  return await bcrypt.hash(s, saltRounds);
};

/**
 * Compares a plain string with a bcrypt hash to determine if they match.
 *
 * @param {string} s - The plain string to be compared.
 * @param {string} hash - The bcrypt hash to compare against.
 * @returns {Promise<boolean>} - A promise that resolves to true if the comparison is successful, otherwise false.
 */
export const bcryptCompare = async (
  s: string,
  hash: string
): Promise<boolean> => {
  return await bcrypt.compare(s, hash);
};

/**
 * Checks if a user's rights string contains the required permission.
 *
 * @param {string | undefined} userRights - Comma-separated permissions string assigned to the user.
 * @param {string} requiredPermission - The permission key to check against.
 * @returns {boolean} True if authorized, otherwise false.
 */
export const hasPermission = (
  userRights: string[] | string | undefined,
  requiredPermission: string
): boolean => {
  if (!userRights) {
    return false;
  }

  // Handle array format (e.g., ['add_role', 'edit_role'])
  if (Array.isArray(userRights)) {
    return userRights.includes(requiredPermission);
  }

  // Handle CSV string format (e.g., 'add_role,edit_role')
  const rightsArray = userRights.split(',').map((right) => right.trim());
  return rightsArray.includes(requiredPermission);
};

export const SERVER_CONST = {
  JWTSECRET: 'SecretKeyOfPMS-SECRET',
  ACCESS_TOKEN_EXPIRY_TIME_SECONDS: 1 * 8 * 60 * 60, // 8 hours
  REFRESH_TOKEN_EXPIRY_TIME_SECONDS: 5 * 7 * 24 * 60 * 60, // 35 days
} as const;
