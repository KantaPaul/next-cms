import DefaultLayout from '@/components/molecules/layouts/default';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DefaultLayout>{children}</DefaultLayout>;
}
