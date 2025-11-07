import type { z } from 'zod';

// Shared types that were causing circular dependencies
export interface ValidationError {
  errors: Record<string | number | symbol, string[] | undefined>;
}

export interface UserCtx {
  userId: string;
}

export interface EmployeeProcedureContext {
  user: UserCtx;
  employee: {
    id: string;
    namingSeries: string | null;
  } | null;
  subOrdinates: { userId: string }[];
  superiors: { userId: string }[];
}

export interface Context {
  user: UserCtx;
}

// Type for a procedure with middlewares and methods
export type Procedure<Ctx, Result> = {
  use: <T>(middleware: (params: { ctx: Result }) => T | Promise<T>) => Procedure<Ctx, T>;
  input: <S extends z.ZodType>(
    schema: S
  ) => {
    action: <Output>(
      fn: (params: { input: z.infer<S>; ctx: Result }) => Promise<Output>
    ) => (
      formData: FormData | Record<string, unknown>
    ) => Promise<Output | ValidationError | ServerError>;
  };
  action: <Output>(
    fn: (params: { ctx: Result; formData: FormData }) => Promise<Output>
  ) => (formData: FormData) => Promise<Output | ServerError>;
  query: <Output, Params = any>(
    fn: (params: { ctx: Result; params: Params }) => Promise<Output>
  ) => (params?: Params) => Promise<Output>;
};

export interface ServerError {
  hasError: boolean;
  message: string;
  errorType: 'Unknown' | 'ZodError' | 'ApplicationException' | 'Error';
}
