import { redirect } from 'next/navigation';
import { PAGES } from '@/config/pages';
import { login } from '@/server/actions/auth.actions';
import { staffAuth } from '@/server/services/staff-auth.service';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const result = await staffAuth.consumeMagicLink(token);
  if (result.error || !result.userId) {
    redirect(`/login?message=${encodeURIComponent(result.error ?? 'This sign-in link is invalid or expired.')}`);
  }
  if (result.totp) redirect('/login?step=totp');
  await login(result.userId);
  redirect(PAGES.DASHBOARD.ROOT);
}
