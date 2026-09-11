import { Request, Response } from 'express';
import { BaseController } from '@/utils/base_controller';
import { ProjectsService } from './projects_service';
import { UsersUtil } from '@/components/users/users_utils';
import { hasPermission, Rights } from '@/utils/common';

export class ProjectsController extends BaseController {
  /**
   * Handles creating a new project.
   */
  public addHandler = async (req: Request, res: Response): Promise<void> => {
    if (
      !hasPermission(req.user?.rights, Rights.PROJECTS?.ADD || 'add_project')
    ) {
      res.status(403).json({
        statusCode: 403,
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const service = await ProjectsService.createInstance();
      const projectPayload = req.body;

      // Validate that all user_ids exist in the database using UsersUtil
      if (projectPayload.user_ids && projectPayload.user_ids.length > 0) {
        const isValidUsers = await UsersUtil.checkValidUserIds(
          projectPayload.user_ids
        );
        if (!isValidUsers) {
          res.status(400).json({
            statusCode: 400,
            status: 'error',
            message: 'Invalid user_ids provided',
          });
          return;
        }
      }

      const createdProject = await service.create(projectPayload);
      res.status(createdProject.statusCode).json(createdProject);
    } catch (error: any) {
      console.error(
        `Error in ProjectsController.addHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles fetching all projects with optional query filtering.
   */
  public getAllHandler = async (req: Request, res: Response): Promise<void> => {
    if (
      !hasPermission(
        req.user?.rights,
        Rights.PROJECTS?.GET_ALL || 'get_all_projects'
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
      const service = await ProjectsService.createInstance();
      const result = await service.findAll(req.query);
      res.status(result.statusCode).json(result);
    } catch (error: any) {
      console.error(
        `Error in ProjectsController.getAllHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles fetching a single project by primary ID.
   */
  public getOneHandler = async (req: Request, res: Response): Promise<void> => {
    if (
      !hasPermission(
        req.user?.rights,
        Rights.PROJECTS?.GET_DETAILS || 'get_project_details'
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
      const service = await ProjectsService.createInstance();
      const id = req.params.id as string;
      const result = await service.findByIds([id]);
      res.status(result.statusCode).json(result);
    } catch (error: any) {
      console.error(
        `Error in ProjectsController.getOneHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles updating an existing project record.
   */
  public updateHandler = async (req: Request, res: Response): Promise<void> => {
    if (
      !hasPermission(req.user?.rights, Rights.PROJECTS?.EDIT || 'edit_project')
    ) {
      res.status(403).json({
        statusCode: 403,
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const service = await ProjectsService.createInstance();
      const id = req.params.id as string;
      const updatePayload = req.body;

      if (updatePayload.user_ids && updatePayload.user_ids.length > 0) {
        const isValidUsers = await UsersUtil.checkValidUserIds(
          updatePayload.user_ids
        );
        if (!isValidUsers) {
          res.status(400).json({
            statusCode: 400,
            status: 'error',
            message: 'Invalid user_ids provided',
          });
          return;
        }
      }

      updatePayload.updated_at = new Date();

      const result = await service.update(id, updatePayload);
      res.status(result.statusCode).json(result);
    } catch (error: any) {
      console.error(
        `Error in ProjectsController.updateHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles project deletion by ID.
   */
  public deleteHandler = async (req: Request, res: Response): Promise<void> => {
    if (
      !hasPermission(
        req.user?.rights,
        Rights.PROJECTS?.DELETE || 'delete_project'
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
      const service = await ProjectsService.createInstance();
      const id = req.params.id as string;
      const result = await service.delete(id);
      res.status(result.statusCode).json(result);
    } catch (error: any) {
      console.error(
        `Error in ProjectsController.deleteHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };
}
