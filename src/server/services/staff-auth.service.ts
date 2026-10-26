import 'server-only';
import { createHmac, createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { ROLE_NAMES, type RoleName } from '@/config/permissions';
import { db } from '@/db';
import { loginTokens, users } from '@/db/schema';
import { UserStatus } from '@/db/schemas/shared.schema';
import { env } from '@/env.mjs';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { generateTotpSecret, totpUri, verifyTotp } from '@/lib/auth/totp';
import { ApplicationException } from '@/lib/utils/error';
import { accessService } from '@/server/services/access.service';
import {
  clearAuthAttempts,
  recordAuthAttempt,
} from '@/server/services/auth-attempts';
import { auditService } from '@/server/services/audit.service';
import { isMailConfigured, sendMail } from '@/server/services/mail';

const PENDING_COOKIE = 'totp_pending';
const GENERIC_LOGIN_ERROR = 'Email or password is incorrect.';
const MAGIC_MINUTES = 15;

function signPending(userId: string) {
  const exp = Date.now() + 5 * 60 * 1000;
  const payload = `${userId}.${exp}`;
  const sig = createHmac('sha256', env.DATABASE_URL).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function readPending(value: string | undefined) {
  if (!value) return null;
  const [userId, exp, sig] = value.split('.');
  if (!userId || !exp || !sig) return null;
  if (Number(exp) < Date.now()) return null;
  const expected = createHmac('sha256', env.DATABASE_URL)
    .update(`${userId}.${exp}`)
    .digest('base64url');
  if (expected !== sig) return null;
  return userId;
}

async function setPending(userId: string) {
  const store = await cookies();
  store.set(PENDING_COOKIE, signPending(userId), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 300,
  });
}

async function clearPending() {
  const store = await cookies();
  store.delete(PENDING_COOKIE);
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

async function activeUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);
  if (!user || user.status !== UserStatus.Active) return null;
  return user;
}

export const staffAuth = {
  password: async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    const user = await activeUserByEmail(normalized);
    const matches =
      Boolean(user?.passwordHash) &&
      (await verifyPassword(password, user!.passwordHash!));
    if (!user || !matches) {
      await recordAuthAttempt({ email: normalized, success: false });
      return { error: GENERIC_LOGIN_ERROR as string, userId: null, totp: false };
    }
    if (user.totpEnabled && user.totpSecret) {
      await setPending(user.id);
      return { error: null, userId: user.id, totp: true };
    }
    await clearAuthAttempts({ email: normalized });
    return { error: null, userId: user.id, totp: false };
  },

  verifyTotp: async (code: string) => {
    const store = await cookies();
    const userId = readPending(store.get(PENDING_COOKIE)?.value);
    if (!userId) return { error: 'That sign-in expired. Start again.', userId: null };
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.totpSecret || !verifyTotp(user.totpSecret, code)) {
      await recordAuthAttempt({ email: user?.email, success: false });
      return { error: 'That code is incorrect.', userId: null };
    }
    await clearPending();
    await clearAuthAttempts({ email: user.email });
    return { error: null, userId: user.id };
  },

  requestMagicLink: async (email: string) => {
    if (!isMailConfigured()) {
      return { error: 'Email is not configured.' as string | null };
    }
    const normalized = email.trim().toLowerCase();
    const user = await activeUserByEmail(normalized);
    if (user) {
      const token = randomBytes(32).toString('base64url');
      await db.insert(loginTokens).values({
        email: normalized,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + MAGIC_MINUTES * 60 * 1000),
      });
      const link = `${env.SITE_URL.replace(/\/$/, '')}/login/magic?token=${encodeURIComponent(token)}`;
      const mailed = await sendMail({
        to: normalized,
        subject: 'Sign in to Next CMS',
        text: `Use this link to sign in. It expires in ${MAGIC_MINUTES} minutes.\n\n${link}`,
      });
      if (!mailed.sent) return { error: mailed.reason ?? 'The email could not be sent.' };
    }
    return { error: null };
  },

  consumeMagicLink: async (token: string) => {
    const tokenHash = hashToken(token);
    const [row] = await db
      .select()
      .from(loginTokens)
      .where(eq(loginTokens.tokenHash, tokenHash))
      .limit(1);
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      return { error: 'This sign-in link is invalid or expired.', userId: null, totp: false };
    }
    await db
      .update(loginTokens)
      .set({ usedAt: new Date() })
      .where(eq(loginTokens.id, row.id));
    const user = await activeUserByEmail(row.email);
    if (!user) {
      return { error: 'This sign-in link is invalid or expired.', userId: null, totp: false };
    }
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, user.id));
    if (user.totpEnabled && user.totpSecret) {
      await setPending(user.id);
      return { error: null, userId: user.id, totp: true };
    }
    await clearAuthAttempts({ email: user.email });
    return { error: null, userId: user.id, totp: false };
  },

  setPassword: async (userId: string, password: string, currentPassword?: string) => {
    if (password.length < 8) {
      throw new ApplicationException('Use at least 8 characters.');
    }
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new ApplicationException('User not found.');
    if (user.passwordHash) {
      const matches = await verifyPassword(currentPassword ?? '', user.passwordHash);
      if (!matches) throw new ApplicationException('Current password is incorrect.');
    }
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(password) })
      .where(eq(users.id, userId));
  },

  totpSetup: async (userId: string) => {
    const access = await accessService.getUserAccess(userId);
    if (access.role !== 'Admin') {
      throw new ApplicationException('Only admins can turn on two-factor authentication.');
    }
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new ApplicationException('User not found.');
    const secret = user.totpEnabled && user.totpSecret ? user.totpSecret : generateTotpSecret();
    if (!user.totpEnabled) {
      await db.update(users).set({ totpSecret: secret, totpEnabled: false }).where(eq(users.id, userId));
    }
    return { secret, uri: totpUri(user.email, secret), enabled: user.totpEnabled };
  },

  enableTotp: async (userId: string, code: string) => {
    const access = await accessService.getUserAccess(userId);
    if (access.role !== 'Admin') {
      throw new ApplicationException('Only admins can turn on two-factor authentication.');
    }
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.totpSecret || !verifyTotp(user.totpSecret, code)) {
      throw new ApplicationException('That code is incorrect.');
    }
    await db.update(users).set({ totpEnabled: true }).where(eq(users.id, userId));
  },

  disableTotp: async (userId: string, code: string) => {
    const access = await accessService.getUserAccess(userId);
    if (access.role !== 'Admin') {
      throw new ApplicationException('Only admins can turn off two-factor authentication.');
    }
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.totpSecret || !verifyTotp(user.totpSecret, code)) {
      throw new ApplicationException('That code is incorrect.');
    }
    await db
      .update(users)
      .set({ totpEnabled: false, totpSecret: null })
      .where(eq(users.id, userId));
  },
};

export async function inviteStaff(input: {
  email: string;
  name?: string;
  role?: RoleName;
  actorId: string;
}) {
  const email = input.email.trim().toLowerCase();
  const roleName = input.role && ROLE_NAMES.includes(input.role) ? input.role : 'Viewer';
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) throw new ApplicationException('A user with that email already exists.');

  const allRoles = await accessService.ensureRolesSeeded();
  const role = allRoles.find(r => r.name === roleName) ?? allRoles.find(r => r.name === 'Viewer');
  if (!role) throw new ApplicationException('Roles are not set up yet.');

  const [created] = await db
    .insert(users)
    .values({
      email,
      name: input.name?.trim() || email.split('@')[0],
      status: UserStatus.Active,
      emailVerified: false,
      roleId: role.id,
    })
    .returning();

  const mailed = await staffAuth.requestMagicLink(email);
  await auditService.log({
    actorId: input.actorId,
    action: 'create',
    targetType: 'user',
    targetId: created.id,
    targetName: created.email,
    details: `Invited as ${role.name}`,
  });
  return {
    id: created.id,
    role: role.name,
    mailed: mailed.error === null,
    mailError: mailed.error,
  };
}
