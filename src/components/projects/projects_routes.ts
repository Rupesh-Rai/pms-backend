import { Express } from 'express';
import { body } from 'express-validator';
import { validate } from '@/utils/validator';
import { authorize } from '@/utils/auth_util';
import { checkValidDate } from '@/utils/common';
import { ProjectsController } from './projects_controller';

// ============================================================================
// Input Validation Schema Definitions
// ============================================================================

export const validProjectInput = [
  body('name').trim().notEmpty().withMessage('Project name is required'),

  body('user_ids')
    .isArray({ min: 1 })
    .withMessage('user_ids must be a non-empty array of user UUIDs')
    .custom((value: string[]) => {
      const uuidPattern =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

      const isValid = value.every((uuid) =>
        uuidPattern.test(String(uuid).trim())
      );
      if (!isValid) {
        throw new Error('One or more user_ids contain an invalid UUID format');
      }

      return true;
    }),

  body('start_time').custom((value: string) => {
    if (!checkValidDate(value)) {
      throw new Error(
        'Invalid start_time format. Required format: YYYY-MM-DD HH:mm:ss'
      );
    }

    const startTime = new Date(value);
    const currentTime = new Date();

    if (startTime <= currentTime) {
      throw new Error('Start time must be greater than the current time');
    }

    return true;
  }),

  body('end_time').custom((value: string, { req }) => {
    if (!checkValidDate(value)) {
      throw new Error(
        'Invalid end_time format. Required format: YYYY-MM-DD HH:mm:ss'
      );
    }

    const startTime = new Date(req.body.start_time);
    const endTime = new Date(value);

    if (endTime <= startTime) {
      throw new Error('End time must be greater than the start time');
    }

    return true;
  }),
];

// ============================================================================
// Project Routes Definition
// ============================================================================

export class ProjectRoutes {
  private readonly baseEndPoint = '/api/projects';

  constructor(app: Express) {
    const controller = new ProjectsController();

    // Collection Endpoints
    app
      .route(this.baseEndPoint)
      .get(authorize, controller.getAllHandler)
      .post(authorize, validate(validProjectInput), controller.addHandler);

    // Individual Item Endpoints
    app
      .route(`${this.baseEndPoint}/:id`)
      .get(authorize, controller.getOneHandler)
      .put(authorize, validate(validProjectInput), controller.updateHandler)
      .delete(authorize, controller.deleteHandler);

    console.log('Initialized routes for ProjectRoutes');
  }
}
