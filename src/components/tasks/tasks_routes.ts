import { Express } from 'express';
import { TasksController } from './tasks_controller';
import { body } from 'express-validator';
import { checkValidDate } from '@/utils/common';
import { authorize } from '@/utils/auth_util';
import { validate } from '@/utils/validator';

export const validTaskInput = [
  body('name').trim().notEmpty().withMessage('Task name is required'),

  body('project_id')
    .trim()
    .notEmpty()
    .withMessage('Project ID is required')
    .isUUID()
    .withMessage('Project ID must be a valid UUID'),

  body('user_id')
    .trim()
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),

  body('estimated_start_time')
    .trim()
    .notEmpty()
    .withMessage('Estimated start time is required')
    .custom((value: string) => {
      if (!checkValidDate(value)) {
        throw new Error(
          'Invalid start date format. Required: YYYY-MM-DD HH:mm:ss'
        );
      }

      const startTime = new Date(value);
      const currentTime = new Date();

      if (startTime <= currentTime) {
        throw new Error(
          'Estimated start time must be greater than the current time'
        );
      }

      return true;
    }),

  body('estimated_end_time')
    .trim()
    .notEmpty()
    .withMessage('Estimated end time is required')
    .custom((value: string, { req }) => {
      if (!checkValidDate(value)) {
        throw new Error(
          'Invalid end date format. Required: YYYY-MM-DD HH:mm:ss'
        );
      }

      const startTime = new Date(req.body.estimated_start_time);
      const endTime = new Date(value);

      if (isNaN(startTime.getTime())) {
        throw new Error(
          'Valid estimated start time is required to evaluate end time'
        );
      }

      if (endTime <= startTime) {
        throw new Error(
          'Estimated end time must be greater than the estimated start time'
        );
      }

      return true;
    }),
];

export const updateTaskInput = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Task name cannot be empty'),

  body('project_id')
    .optional()
    .trim()
    .isUUID()
    .withMessage('Project ID must be a valid UUID'),

  body('user_id')
    .optional()
    .trim()
    .isUUID()
    .withMessage('User ID must be a valid UUID'),

  body('estimated_start_time')
    .optional()
    .trim()
    .custom((value: string) => {
      if (!value) return true;

      if (!checkValidDate(value)) {
        throw new Error(
          'Invalid start date format. Required: YYYY-MM-DD HH:mm:ss'
        );
      }

      const startTime = new Date(value);
      const currentTime = new Date();

      if (startTime <= currentTime) {
        throw new Error(
          'Estimated start time must be greater than the current time'
        );
      }

      return true;
    }),

  body('estimated_end_time')
    .optional()
    .trim()
    .custom((value: string, { req }) => {
      if (!value) return true;

      if (!checkValidDate(value)) {
        throw new Error(
          'Invalid end date format. Required: YYYY-MM-DD HH:mm:ss'
        );
      }

      // Check against updated start time in body if provided
      if (req.body.estimated_start_time) {
        const startTime = new Date(req.body.estimated_start_time);
        const endTime = new Date(value);

        if (!isNaN(startTime.getTime()) && endTime <= startTime) {
          throw new Error(
            'Estimated end time must be greater than the estimated start time'
          );
        }
      }

      return true;
    }),
];

export class TaskRoutes {
  private baseEndPoint = '/api/tasks';

  constructor(app: Express) {
    const controller = new TasksController();

    // Collection Endpoints
    app
      .route(this.baseEndPoint)
      .get(authorize, controller.getAllHandler)
      .post(authorize, validate(validTaskInput), controller.addHandler);

    // Individual Item Endpoints
    app
      .route(`${this.baseEndPoint}/:id`)
      .get(authorize, controller.getOneHandler)
      .put(authorize, validate(updateTaskInput), controller.updateHandler)
      .delete(authorize, controller.deleteHandler);

    // Attachment Route
    app
      .route(`${this.baseEndPoint}/:id/attachments`)
      .post(authorize, controller.uploadAttachmentHandler);
  }
}
