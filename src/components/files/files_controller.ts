import { Request, Response } from 'express';
import path from 'path';
import { FilesService } from './files_service';
import { TasksService } from '@/components/tasks/tasks_service';
import { config } from '@/utils/config';
import { hasPermission, Rights } from '@/utils/common';

export class FilesController {
  /**
   * Streams physical binary file to client by file ID.
   */
  public getOneHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const fileId = req.params.id as string;
      const service = await FilesService.createInstance();

      const fileResult = await service.findByIds([fileId]);
      if (!fileResult.data || fileResult.data.length === 0) {
        res.status(404).json({
          statusCode: 404,
          status: 'error',
          message: 'File not found',
        });
        return;
      }

      const fileRecord = fileResult.data[0];
      const absoluteFilePath = path.join(
        config.attached_files_path,
        fileRecord.file_name
      );

      res.sendFile(absoluteFilePath, (err) => {
        if (err && !res.headersSent) {
          res.status(404).json({
            statusCode: 404,
            status: 'error',
            message: 'Physical file missing from storage path',
          });
        }
      });
    } catch (error: any) {
      console.error(
        `Error in FilesController.getOneHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };

  /**
   * Deletes a file record, its local disk file, and references in associated tasks.
   */
  public deleteHandler = async (req: Request, res: Response): Promise<void> => {
    if (!hasPermission(req.user?.rights, Rights.TASKS?.EDIT || 'edit_task')) {
      res.status(403).json({
        statusCode: 403,
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    try {
      const fileId = req.params.id as string;
      const filesService = await FilesService.createInstance();

      // Fetch file to get task_id before removal
      const fileResult = await filesService.findByIds([fileId]);
      if (!fileResult.data || fileResult.data.length === 0) {
        res.status(404).json({
          statusCode: 404,
          status: 'error',
          message: 'File not found',
        });
        return;
      }

      const fileRecord = fileResult.data[0];

      // Delete file from disk & files table
      const deleteResult = await filesService.deleteFile(fileId);

      // Clean up supported_files array on parent task if task_id exists
      if (fileRecord.task_id) {
        const tasksService = await TasksService.createInstance();
        const taskResult = await tasksService.findByIds([fileRecord.task_id]);

        if (taskResult.data && taskResult.data.length > 0) {
          const task = taskResult.data[0];
          const updatedFiles = (task.supported_files || []).filter(
            (id) => id !== fileId
          );
          await tasksService.update(fileRecord.task_id, {
            supported_files: updatedFiles,
          });
        }
      }

      res.status(deleteResult.statusCode).json(deleteResult);
    } catch (error: any) {
      console.error(
        `Error in FilesController.deleteHandler: ${error?.message || error}`
      );
      res.status(500).json({
        statusCode: 500,
        status: 'error',
        message: 'Internal server error',
      });
    }
  };
}
