import { Request, Response } from 'express';
import { BaseController } from '@/utils/base_controller';
import { TasksService } from './tasks_service';
import { UsersUtil } from '@/components/users/users_utils';
import { ProjectsUtil } from '@/components/projects/projects_utils';
import { hasPermission, Rights } from '@/utils/common';

export class TasksController extends BaseController {
  /**
   * Handles creating a new task record.
   */
  public addHandler = async (req: Request, res: Response): Promise<void> => {
    if (!hasPermission(req.user?.rights, Rights.TASKS?.ADD || 'add_task')) {
      res.status(403).json({
        statusCode: 403,
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const service = await TasksService.createInstance();
      const taskPayload = req.body;

      // Validate project_id
      const isValidProject = await ProjectsUtil.checkValidProjectIds([
        taskPayload.project_id,
      ]);
      if (!isValidProject) {
        res.status(400).json({
          statusCode: 400,
          status: 'error',
          message: 'Invalid project_id',
        });
        return;
      }

      // Validate user_id
      const isValidUser = await UsersUtil.checkValidUserIds([
        taskPayload.user_id,
      ]);
      if (!isValidUser) {
        res.status(400).json({
          statusCode: 400,
          status: 'error',
          message: 'Invalid user_id',
        });
        return;
      }

      const createdTask = await service.create(taskPayload);
      res.status(createdTask.statusCode).json(createdTask);
    } catch (error: any) {
      console.error(
        `Error in TasksController.addHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles fetching all tasks.
   */
  public getAllHandler = async (req: Request, res: Response): Promise<void> => {
    if (
      !hasPermission(req.user?.rights, Rights.TASKS?.GET_ALL || 'get_all_tasks')
    ) {
      res.status(403).json({
        statusCode: 403,
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const service = await TasksService.createInstance();
      const result = await service.findAll(req.query);
      res.status(result.statusCode).json(result);
    } catch (error: any) {
      console.error(
        `Error in TasksController.getAllHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles fetching a single task by ID.
   */
  public getOneHandler = async (req: Request, res: Response): Promise<void> => {
    if (
      !hasPermission(
        req.user?.rights,
        Rights.TASKS?.GET_DETAILS || 'get_task_details'
      )
    ) {
      res.status(403).json({
        statusCode: 403,
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const service = await TasksService.createInstance();
      const id = req.params.id as string;
      const result = await service.findByIds([id]);
      res.status(result.statusCode).json(result);
    } catch (error: any) {
      console.error(
        `Error in TasksController.getOneHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles updating an existing task record.
   */
  public updateHandler = async (req: Request, res: Response): Promise<void> => {
    if (!hasPermission(req.user?.rights, Rights.TASKS?.EDIT || 'edit_task')) {
      res.status(403).json({
        statusCode: 403,
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const service = await TasksService.createInstance();
      const id = req.params.id as string;
      const updatePayload = req.body;

      if (updatePayload.project_id) {
        const isValidProject = await ProjectsUtil.checkValidProjectIds([
          updatePayload.project_id,
        ]);
        if (!isValidProject) {
          res.status(400).json({
            statusCode: 400,
            status: 'error',
            message: 'Invalid project_id',
          });
          return;
        }
      }

      if (updatePayload.user_id) {
        const isValidUser = await UsersUtil.checkValidUserIds([
          updatePayload.user_id,
        ]);
        if (!isValidUser) {
          res.status(400).json({
            statusCode: 400,
            status: 'error',
            message: 'Invalid user_id',
          });
          return;
        }
      }

      updatePayload.updated_at = new Date();

      const result = await service.update(id, updatePayload);
      res.status(result.statusCode).json(result);
    } catch (error: any) {
      console.error(
        `Error in TasksController.updateHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles deleting a task by ID.
   */
  public deleteHandler = async (req: Request, res: Response): Promise<void> => {
    if (
      !hasPermission(req.user?.rights, Rights.TASKS?.DELETE || 'delete_task')
    ) {
      res.status(403).json({
        statusCode: 403,
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const service = await TasksService.createInstance();
      const id = req.params.id as string;
      const result = await service.delete(id);
      res.status(result.statusCode).json(result);
    } catch (error: any) {
      console.error(
        `Error in TasksController.deleteHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };
}
