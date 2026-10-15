import { getCurrentUserAndTeamId } from '@/lib/auth';
import { AccessProvider } from '@/providers/access.provider';
import { accessService } from '@/server/services/access.service';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await getCurrentUserAndTeamId();
  const access = await accessService.getUserAccess(userId);

  return <AccessProvider value={access}>{children}</AccessProvider>;
}
