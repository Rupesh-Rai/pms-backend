export const CacheKeys = {
  roles: {
    all: 'roles:all', // Simple string for static key
  },

  users: {
    byId: (userId: string | number) => `user:${userId}`,
  },

  projects: {
    byId: (projectId: string | number) => `project:${projectId}`,
    tasks: (projectId: string | number) => `project:${projectId}:tasks`,
    members: (projectId: string | number) => `project:${projectId}:members`,
    stats: (projectId: string | number) => `project:${projectId}:stats`,
    wildcard: (projectId: string | number) => `project:${projectId}:*`,
  },

  tasks: {
    byId: (taskId: string | number) => `task:${taskId}`,
  },
} as const;

export const CacheTTL = {
  // Static / Low-churn data
  ROLES: 86400, // 24 hours (or infinite if proactively managed)

  // Medium-churn entity data
  USER: 3600, // 1 hour
  PROJECT: 1800, // 30 minutes
  PROJECT_MEMBERS: 1800, // 30 minutes

  // High-churn / Frequent update data
  PROJECT_TASKS: 600, // 10 minutes
  TASK: 300, // 5 minutes
  PROJECT_STATS: 300, // 5 minutes
} as const;
