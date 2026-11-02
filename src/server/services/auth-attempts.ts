import 'server-only';
import { authRateLimitService } from '@/server/services/auth-rate-limit.service';

export async function recordAuthAttempt(input: {
  email?: string;
  success: boolean;
}) {
  if (!input.email || input.success) return;
  await authRateLimitService.recordFailedLogin(input.email, input.email);
}

export async function clearAuthAttempts(input: { email?: string }) {
  if (!input.email) return;
  await authRateLimitService.clearFailedLogins(input.email, input.email);
}
