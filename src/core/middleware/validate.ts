import type { NextFunction, Request, Response } from 'express';
import type { ObjectSchema } from 'joi';

import { BadRequestError } from '../errors/custom-errors.js';

type RequestProperty = 'body' | 'params' | 'query';

type ValidationSchemas = Partial<Record<RequestProperty, ObjectSchema>>;

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      for (const property of Object.keys(schemas) as RequestProperty[]) {
        const schema = schemas[property];

        if (!schema) continue;

        const { error, value } = schema.validate(req[property], {
          abortEarly: false,
          stripUnknown: true,
        });

        if (error) {
          const message = error.details.map((detail) => detail.message).join(', ');

          throw new BadRequestError(message);
        }

        req[property] = value;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
