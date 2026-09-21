import { validate } from './src/middleware/validate';
import { z } from 'zod';
import { Request, Response } from 'express';

const schema = z.object({
  body: z.object({
    password: z.string().min(8)
  })
});

const req = { body: { password: '123' } } as Request;
const res = {} as Response;
const next = (err?: any) => {
  if (err) {
    console.log('Validation failed (as expected):', err.message);
  } else {
    console.log('Validation succeeded (unexpected for short password)');
  }
};

const middleware = validate(schema);
middleware(req, res, next);
