import { env } from '@/env.mjs';

type ENV = 'qa' | 'dev' | 'local' | 'uat' | 'prod';

export const APP_VERSION: `${string}-${ENV}` = (env.NEXT_PUBLIC_APP_VERSION ??
  'v0.x.x-local') as `${string}-${ENV}`;

export const APP_ENV = {
  isLocal: APP_VERSION.endsWith('local'),
  isDev: APP_VERSION.endsWith('develop'),
  isQa: APP_VERSION.endsWith('qa'),
  isUat: APP_VERSION.endsWith('uat'),
  isProd: APP_VERSION.endsWith('prod'),
  current: (APP_VERSION.split('-').pop() ?? 'local') as ENV,
  filter: <T extends Record<string, any>>(items: Array<T | null | undefined>) =>
    items.filter((item) => item !== null && item !== undefined),
  disableFor: <T>(env: ENV | ENV[], item: T) => {
    const envs = Array.isArray(env) ? env : [env];
    return envs.includes(APP_ENV.current) ? null : item;
  },
  enableFor: <T>(env: ENV | ENV[], item: T) => {
    const envs = Array.isArray(env) ? env : [env];
    return envs.includes(APP_ENV.current) ? item : null;
  },
};
