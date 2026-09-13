import multer from 'multer';
import { Request } from 'express';
import { config } from './config';

export const multerConfig: multer.Options = {
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      // Uses attached_files_path configured in config.ts
      cb(null, config.attached_files_path);
    },
    filename: (_req, file, cb) => {
      // Sanitizes and generates a unique timestamped filename
      const sanitizedName = file.originalname.replace(/\s+/g, '_');
      const uniqueFileName = `${Date.now()}-${sanitizedName}`;
      cb(null, uniqueFileName);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid file type. Only PDF, JPEG, and PNG files are allowed.'
        )
      );
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
};

const upload = multer(multerConfig);

// Single file upload middleware targeting the 'file' field key in Form-Data
export const fileUploadMiddleware = upload.single('file');

/**
 * Extracts and returns uploaded file metadata from Request object.
 */
export const uploadFile = (req: Request): Express.Multer.File => {
  if (!req.file) {
    throw new Error('No file uploaded');
  }
  return req.file;
};
