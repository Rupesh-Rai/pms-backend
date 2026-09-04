import { Express } from 'express';
import { UsersController } from './users_controller';

export class UserRoutes {
    private baseEndPoint = '/api/users';
    constructor(app: Express) {
        const controller = new UsersController();

        app.route(this.baseEndPoint)
        .get(controller.getAllHandler)
        .post(controller.addHandler);

        app.route(this.baseEndPoint + '/:id')
        .get(controller.getDetailsHandler)
        .put(controller.updateHandler)
        .delete(controller.deleteHandler);
    }

}