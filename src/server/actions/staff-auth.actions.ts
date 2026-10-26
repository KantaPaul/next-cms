'use server';

import { redirect } from 'next/navigation';
import { PAGES } from '@/config/pages';
import { login } from '@/server/actions/auth.actions';
import { staffAuth } from '@/server/services/staff-auth.service';

export async function loginWithPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const result = await staffAuth.password(email, password);
  if (result.error || !result.userId) return { error: result.error ?? 'Email or password is incorrect.' };
  if (result.totp) redirect('/login?step=totp');
  await login(result.userId);
  redirect(PAGES.DASHBOARD.ROOT);
}

export async function verifyLoginTotp(formData: FormData) {
  const result = await staffAuth.verifyTotp(String(formData.get('code') ?? ''));
  if (result.error || !result.userId) return { error: result.error ?? 'That code is incorrect.' };
  await login(result.userId);
  redirect(PAGES.DASHBOARD.ROOT);
}

export async function requestMagicLink(formData: FormData) {
  const result = await staffAuth.requestMagicLink(String(formData.get('email') ?? ''));
  if (result.error) return { error: result.error, message: null };
  return {
    error: null,
    message: 'If an account exists for that email, a sign-in link is on the way.',
  };
}

export async function setPassword(formData: FormData) {
  const { requireSession } = await import('@/server/actions/auth.actions');
  const session = await requireSession();
  try {
    await staffAuth.setPassword(
      session.session.userId,
      String(formData.get('password') ?? ''),
      String(formData.get('currentPassword') ?? '')
    );
    return { message: 'Password saved.' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the password.' };
  }
}

export async function enableTotp(formData: FormData) {
  const { requireSession } = await import('@/server/actions/auth.actions');
  const session = await requireSession();
  try {
    await staffAuth.enableTotp(session.session.userId, String(formData.get('code') ?? ''));
    return { message: 'Two-factor authentication is on.' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not enable two-factor authentication.' };
  }
}

export async function disableTotp(formData: FormData) {
  const { requireSession } = await import('@/server/actions/auth.actions');
  const session = await requireSession();
  try {
    await staffAuth.disableTotp(session.session.userId, String(formData.get('code') ?? ''));
    return { message: 'Two-factor authentication is off.' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not turn off two-factor authentication.' };
  }
}
