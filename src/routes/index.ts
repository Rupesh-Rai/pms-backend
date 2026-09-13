import { Express, Router } from 'express';
import { RoleRoutes } from '@/components/roles/roles_routes';
import { ProjectRoutes } from '@/components/projects/projects_routes';
import { TaskRoutes } from '@/components/tasks/tasks_routes';
import { CommentRoutes } from '@/components/comments/comments_routes';
import { UserRoutes } from '@/components/users/users_routes';
import { FilesRoutes } from '@/components/files/files_routes';

export class Routes {
  public router!: Router;

  constructor(app: Express) {
    const routeClass = [
      RoleRoutes,
      UserRoutes,
      ProjectRoutes,
      TaskRoutes,
      CommentRoutes,
      FilesRoutes,
    ];

    for (const RouteClass of routeClass) {
      try {
        new RouteClass(app);
        console.log(`Initialized routes for ${RouteClass.name}`);
      } catch (error) {
        console.log('Initializing routes...');

        console.error(
          `Error occurred while initializing ${RouteClass.name}:`,
          error
        );
      }
    }
  }
}
