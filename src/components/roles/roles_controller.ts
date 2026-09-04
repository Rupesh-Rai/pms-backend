import { Request, Response } from 'express';
import { BaseController } from '@/utils/base_controller';
import { Rights } from '@/utils/common';
import { RolesService } from './roles_service';

export class RolesController extends BaseController {
  public addHandler = async (req: Request, res: Response): Promise<void> => {
    const role = req.body;
    const service = await RolesService.createInstance();
    const result = await service.create(role);

    res.status(result.statusCode).json(result);
  };

  public getAllHandler = async (req: Request, res: Response): Promise<void> => {
    // getAllHandler
  };

  public getOneHandler = async (req: Request, res: Response): Promise<void> => {
    // Logic to retrieve single role by ID
  };

  public updateHandler = async (req: Request, res: Response): Promise<void> => {
    // updateHandler
  };

  public deleteHandler = async (req: Request, res: Response): Promise<void> => {
    // deleteHandler
  };
}
