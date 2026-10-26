// src/env.mjs
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  /*
   * Server side Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    DATABASE_URL: z
      .string()
      .default('postgres://postgres:postgres@localhost:5432/postgres'),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    SITE_URL: z.string().default('http://localhost:3000'),

    GOOGLE_CLIENT_ID: z.string().default('placeholder'),
    GOOGLE_CLIENT_SECRET: z.string().default('placeholder'),
    GOOGLE_REDIRECT_URI: z
      .string()
      .default('http://localhost:3000/login/google/callback'),

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    MEDIA_LOCAL_DIR: z.string().default('uploads'),
    MEDIA_MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ENDPOINT: z.string().url().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_PUBLIC_URL: z.string().url().optional(),

    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default('gemini-2.5-flash'),

    CRON_SECRET: z.string().optional(),

    MAIL_FROM: z.string().optional(),
    FORM_NOTIFY_TO: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().positive().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    TURNSTILE_SECRET_KEY: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_NAME: z.string().default('Next CMS'),
    NEXT_PUBLIC_BASE_URL: z.string().default('http://localhost:3000'),
    NEXT_PUBLIC_APP_VERSION: z.string().optional(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  },
  /*
   * Due to how Next.js bundles environment variables on Edge and Client,
   * we need to manually destructure them to make sure all are included in bundle.
   *
   * 💡 You'll get type errors if not all variables from `server` & `client` are included here.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    SITE_URL: process.env.SITE_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    DATABASE_URL: process.env.DATABASE_URL,

    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,

    STORAGE_DRIVER: process.env.STORAGE_DRIVER,
    MEDIA_LOCAL_DIR: process.env.MEDIA_LOCAL_DIR,
    MEDIA_MAX_UPLOAD_MB: process.env.MEDIA_MAX_UPLOAD_MB,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_REGION: process.env.S3_REGION,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_PUBLIC_URL: process.env.S3_PUBLIC_URL,

    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,

    CRON_SECRET: process.env.CRON_SECRET,

    MAIL_FROM: process.env.MAIL_FROM,
    FORM_NOTIFY_TO: process.env.FORM_NOTIFY_TO,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,

    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  },
});
