import { Repository } from 'typeorm';
import fs from 'fs';
import path from 'path';
import { BaseService, ApiResponse } from '@/utils/base_service';
import { DatabaseUtil } from '@/utils/db';
import { Files } from './files_entity';
import { config } from '@/utils/config';

export class FilesService extends BaseService<Files> {
  private constructor(repository: Repository<Files>) {
    super(repository);
  }

  public static async createInstance(): Promise<FilesService> {
    const dbUtil = await DatabaseUtil.getInstance();
    const repository = dbUtil.getRepository(Files);
    return new FilesService(repository);
  }

  public async saveFileRecord(
    fileData: Express.Multer.File,
    userId: string,
    taskId?: string
  ): Promise<Files> {
    const newFile = this.repository.create({
      file_name: fileData.filename,
      mime_type: fileData.mimetype,
      file_url: fileData.path,
      user_id: userId,
      task_id: taskId || undefined,
    });

    return await this.repository.save(newFile);
  }

  /**
   * Removes physical file from disk and deletes DB record.
   */
  public async deleteFile(fileId: string): Promise<ApiResponse<null>> {
    const fileResult = await this.findByIds([fileId]);

    if (!fileResult.data || fileResult.data.length === 0) {
      return {
        statusCode: 404,
        status: 'error',
        message: 'File not found',
      };
    }

    const fileRecord = fileResult.data[0];
    const absoluteFilePath = path.join(
      config.attached_files_path,
      fileRecord.file_name
    );

    // Remove physical file from disk
    try {
      if (fs.existsSync(absoluteFilePath)) {
        await fs.promises.unlink(absoluteFilePath);
      }
    } catch (err: any) {
      console.error(`Failed to delete physical file: ${err?.message || err}`);
    }

    // Remove entity from database
    await this.repository.delete(fileId);

    return {
      statusCode: 200,
      status: 'success',
      data: null,
    };
  }
}
