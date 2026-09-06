import { Request, Response } from 'express';
import { BaseController } from '@/utils/base_controller';
import { RolesService } from './roles_service';
import { hasPermission, Rights } from '@/utils/common';

export class RolesController extends BaseController {
  /**
   * Handles creating a new role.
   */
  public addHandler = async (req: Request, res: Response): Promise<void> => {
    if (!hasPermission(req.user?.rights, Rights.ROLES?.ADD || 'ROLES_ADD')) {
      res.status(403).json({
        statusCode: 403,
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const { v4: uuidv4 } = await import('uuid');
      const service = await RolesService.createInstance();
      const rolePayload = req.body;

      const newRole = {
        ...rolePayload,
        role_id: uuidv4(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = await service.create(newRole);
      res.status(result.statusCode).json(result);
    } catch (error: any) {
      console.error(
        `Error in RolesController.addHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles fetching all roles.
   */
  public getAllHandler = async (req: Request, res: Response): Promise<void> => {
    if (
      !hasPermission(req.user?.rights, Rights.ROLES?.GET_ALL || 'ROLES_GET_ALL')
    ) {
      res.status(403).json({
        statusCode: 403,
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const service = await RolesService.createInstance();
      const result = await service.findAll(req.query);
      res.status(result.statusCode).json(result);
    } catch (error: any) {
      console.error(
        `Error in RolesController.getAllHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles fetching a single role by ID.
   */
  public getOneHandler = async (req: Request, res: Response): Promise<void> => {
    if (
      !hasPermission(
        req.user?.rights,
        Rights.ROLES?.GET_DETAILS || 'ROLES_GET_DETAILS'
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
      const service = await RolesService.createInstance();
      const id = req.params.id as string;
      const result = await service.findByIds([id]);
      res.status(result.statusCode).json(result);
    } catch (error: any) {
      console.error(
        `Error in RolesController.getOneHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles updating a role.
   */
  public updateHandler = async (req: Request, res: Response): Promise<void> => {
    if (!hasPermission(req.user?.rights, Rights.ROLES?.EDIT || 'ROLES_EDIT')) {
      res.status(403).json({
        statusCode: 403,
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const service = await RolesService.createInstance();
      const id = req.params.id as string;
      const updatePayload = {
        ...req.body,
        updated_at: new Date(),
      };

      const result = await service.update(id, updatePayload);
      res.status(result.statusCode).json(result);
    } catch (error: any) {
      console.error(
        `Error in RolesController.updateHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Handles deleting a role.
   */
  public deleteHandler = async (req: Request, res: Response): Promise<void> => {
    if (
      !hasPermission(req.user?.rights, Rights.ROLES?.DELETE || 'ROLES_DELETE')
    ) {
      res.status(403).json({
        statusCode: 403,
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const service = await RolesService.createInstance();
      const id = req.params.id as string;
      const result = await service.delete(id);
      res.status(result.statusCode).json(result);
    } catch (error: any) {
      console.error(
        `Error in RolesController.deleteHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };
}
