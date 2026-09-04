import express from 'express';
import { validationResult, type ContextRunner } from 'express-validator';

export interface IValidationError {
  type?: string;
  msg?: string;
  path?: string;
  location?: string;
}

export const validate = (validations: ContextRunner[]) => {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    // Run all validation chains in parallel
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors into { [fieldPath]: errorMessage } objects
    const errorMessages = errors.array().map((error: IValidationError) => {
      const fieldPath = error.path ?? 'unknown';
      return {
        [fieldPath]: error.msg ?? 'Invalid value',
      };
    });

    return res.status(400).json({
      statusCode: 400,
      status: 'error',
      errors: errorMessages,
    });
  };
};