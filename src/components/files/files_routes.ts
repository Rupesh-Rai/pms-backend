import { Express } from 'express';
import { FilesController } from './files_controller';
import { authorize } from '@/utils/auth_util';

export class FilesRoutes {
  private baseEndPoint = '/api/files';

  constructor(app: Express) {
    const controller = new FilesController();

    app
      .route(`${this.baseEndPoint}/:id`)
      .get(authorize, controller.getOneHandler)
      .delete(authorize, controller.deleteHandler);
  }
}
