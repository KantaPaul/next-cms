import { toast } from 'react-hot-toast';
import { z } from 'zod';

import { consola } from 'consola';
import { MESSAGES } from '@/config/messages';
import PostgresErrorHandler from '@/lib/utils/postgres-error-handler';
import { APP_ENV } from '@/lib/utils/app-version';

export type ServerError = {
  hasError: boolean;
  message: string;
  errorType: 'Unknown' | 'ZodError' | 'ApplicationException' | 'Error';
};

export class ApplicationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationException';
  }
}

export class InvalidArgumentException extends ApplicationException {
  constructor() {
    super(MESSAGES.INVALID_ARGUMENT);
    this.name = 'ApplicationException';
  }
}

export class NotFoundException extends ApplicationException {
  constructor(string: string = MESSAGES.NOT_FOUND_EXCEPTION) {
    super(string);
    this.name = 'ApplicationException';
  }
}

export const handleServerError = (error: unknown): ServerError => {
  if (process.env.NODE_ENV !== 'production') console.log(error);
  if (APP_ENV.isUat) console.error(error);

  let message = '';
  let errorType: 'Unknown' | 'ZodError' | 'ApplicationException' | 'Error';

  switch (true) {
    case error instanceof z.ZodError: {
      const errors = error.issues.map((err) => {
        return err.message;
      });
      message = errors.join('\n');
      errorType = 'ZodError';
      break;
    }

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

export const showErrorToast = (message: string) => {
  return toast.error(message);
};

export const handleError = (error: unknown) => {
  if (process.env.NODE_ENV !== 'production') consola.error(error);
  if (APP_ENV.isUat) console.error(error);

  if (error instanceof z.ZodError) {
    const errors = error.issues.map((err) => {
      return err.message;
    });
    return toast.error(errors.join('\n'));
  } else if (error instanceof Error) {
    return toast.error(error.message);
  } else {
    return toast.error(MESSAGES.SOMETHING_WENT_WRONG_PLEASE_TRY_AGAIN_LATER);
  }
};

export const handleErrorMessage = (error: unknown, message: string) => {
  console.error(error);
  return toast.error(message);
};
