import {
  getCurrentUserAndTeamId,
} from '@/lib/auth/auth-utils';
import {
  type Context
} from '@/lib/types/procedure-types';
import { procedure } from './procedure.builder';

export const protectedProcedure = procedure.use<Context>(async () => {
  const user = await getCurrentUserAndTeamId();
  return { user };
});