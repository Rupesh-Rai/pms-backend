import { Express } from 'express';
import { TasksController } from './tasks_controller';

export class TaskRoutes {
    private baseEndPoint = '/api/tasks';
    constructor(app: Express) {
        const controller = new TasksController();

        app.route(this.baseEndPoint)
        .get(controller.getAllHandler)
        .post(controller.addHandler);

        app.route(this.baseEndPoint + '/:id')
        .get(controller.getDetailsHandler)
        .put(controller.updateHandler)
        .delete(controller.deleteHandler);
    }

}