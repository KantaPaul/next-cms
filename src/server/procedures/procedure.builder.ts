'server only';

import { ApplicationException } from '@/lib/utils/error';
import PostgresErrorHandler from '@/lib/utils/postgres-error-handler';
import { z } from 'zod';
import {
  type ValidationError,
  type ServerError,
  type Procedure,
} from '@/lib/types';
import log from '@/lib/logger/utils';

type Context<T> = { ctx: T };
type MiddlewareFunction<T, R> = (params: Context<T>) => R | Promise<R>;

// Type for a procedure with middlewares and methods

// Helper functions
const parseFormData = (formData: FormData | Record<string, unknown>): Record<string, unknown> => {
  return formData instanceof FormData ? Object.fromEntries(formData) : formData;
};

const formatFieldName = (path: string): string => {
  if (!path) return 'Input';

  return path
    .split('.')
    .map((segment) =>
      segment
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .join(' → ');
};

const formatZodMessage = (message: string, fieldName: string): string => {
  const improvements: Record<string, string> = {
    'String must contain at least 1 character(s)': `${fieldName} is required`,
    Required: `${fieldName} is required`,
    'Expected string, received undefined': `${fieldName} is required`,
    'Expected number, received undefined': `${fieldName} is required`,
    'Expected string, received null': `${fieldName} cannot be empty`,
    'Invalid email': `${fieldName} must be a valid email address`,
    'Invalid url': `${fieldName} must be a valid URL`,
    'Invalid uuid': `${fieldName} must be a valid ID`,
  };

  if (improvements[message]) {
    return improvements[message];
  }

  if (message.includes('String must contain at least')) {
    const match = message.match(/at least (\d+) character/);
    const minLength = match ? match[1] : '1';
    return `${fieldName} must be at least ${minLength} characters long`;
  }

  if (message.includes('String must contain at most')) {
    const match = message.match(/at most (\d+) character/);
    const maxLength = match ? match[1] : '255';
    return `${fieldName} must be no more than ${maxLength} characters long`;
  }

  if (message.includes('Number must be greater than or equal to')) {
    const match = message.match(/greater than or equal to (-?\d+)/);
    const min = match ? match[1] : '0';
    return `${fieldName} must be at least ${min}`;
  }

  if (message.includes('Number must be less than or equal to')) {
    const match = message.match(/less than or equal to (-?\d+)/);
    const max = match ? match[1] : '100';
    return `${fieldName} must be no more than ${max}`;
  }

  if (message.includes('Expected')) {
    const typeMatch = message.match(/Expected (\w+), received (\w+)/);

    if (typeMatch) {
      const [, expected, received] = typeMatch;
      return `${fieldName} must be a ${expected}, but received ${received}`;
    }
  }

  if (message.includes('Invalid enum value')) {
    const enumMatch = message.match(/Expected (.+), received/);

    if (enumMatch) {
      const validOptions = enumMatch[1].replace(/'/g, '"');
      return `${fieldName} must be one of: ${validOptions}`;
    }
  }

  if (!message.toLowerCase().includes(fieldName.toLowerCase())) {
    return `${fieldName}: ${message}`;
  }

  return message;
};

const handleValidationError = (error: z.ZodError): ValidationError => {
  log.error('handleValidationError: error', { error });

  const errors: Record<string, string[]> = {};

  error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    const fieldName = formatFieldName(path);
    const userFriendlyMessage = formatZodMessage(issue.message, fieldName);

    if (!errors[path]) errors[path] = [];
    errors[path].push(userFriendlyMessage);
  });

  return { errors };
};

const formatZodErrorsForServerError = (error: z.ZodError): string => {
  return error.issues
    .map((issue) => {
      const fieldName = formatFieldName(issue.path.join('.'));
      return formatZodMessage(issue.message, fieldName);
    })
    .join(', ');
};

const handleServerError = (error: unknown) => {
  log.error('handleServerError: error', { error });

  let message = '';
  let errorType: 'Unknown' | 'ZodError' | 'ApplicationException' | 'Error';

  switch (true) {
    case error instanceof z.ZodError:
      message = formatZodErrorsForServerError(error);
      errorType = 'ZodError';
      break;

    case error instanceof ApplicationException:
      message = error.message;
      errorType = 'ApplicationException';
      break;

    case error instanceof Error:
      return PostgresErrorHandler.getUserFriendlyMessage(error);

    default:
      return PostgresErrorHandler.getUserFriendlyMessage(error);
  }

  return {
    hasError: true,
    message,
    errorType,
  };
};

// Factory function to create a procedure with middlewares
const createProcedureWithMiddlewares = <Ctx, Result>(
  middlewares: MiddlewareFunction<any, any>[]
): Procedure<Ctx, Result> => {
  // Execute all middlewares in sequence
  const executeMiddlewares = async (): Promise<Result> => {
    return middlewares.reduce(
      async (acc, middleware) => {
        const resolvedAcc = await acc;
        return middleware({ ctx: resolvedAcc as Ctx });
      },
      Promise.resolve({}) as Promise<Result>
    );
  };

  return {
    use: <T>(middleware: MiddlewareFunction<Result, T>): Procedure<Ctx, T> => {
      return createProcedureWithMiddlewares<Ctx, T>([
        ...middlewares,
        middleware as MiddlewareFunction<any, any>,
      ]);
    },

    input: <S extends z.ZodType>(schema: S) => {
      return {
        action: <Output>(
          fn: (params: { input: z.infer<S>; ctx: Result }) => Promise<Output>
        ): ((
          formData: FormData | Record<string, unknown>
        ) => Promise<Output | ValidationError | ServerError>) => {
          return async (formData) => {
            try {
              const ctx = await executeMiddlewares();
              const data = parseFormData(formData);
              const validatedData = schema.parse(data);

              return await fn({ ctx, input: validatedData });
            } catch (error) {
              return handleServerError(error);
            }
          };
        },
      };
    },

    action: <Output>(fn: (params: { ctx: Result; formData: FormData }) => Promise<Output>) => {
      return async (formData: FormData): Promise<Output | ServerError> => {
        try {
          const ctx = await executeMiddlewares();
          return await fn({ ctx, formData });
        } catch (error) {
          return handleServerError(error);
        }
      };
    },

    query: <Output, Params = any>(
      fn: (params: { ctx: Result; params: Params }) => Promise<Output>
    ) => {
      return async (params?: Params): Promise<Output> => {
        const ctx = await executeMiddlewares();
        return fn({ ctx, params: params ?? ({} as Params) });
      };
    },
  };
};

// Create the base procedure
export const procedure = createProcedureWithMiddlewares<unknown, unknown>([]);
