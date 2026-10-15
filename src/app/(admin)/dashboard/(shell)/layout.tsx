import DefaultLayout from '@/components/molecules/layouts/default';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <DefaultLayout>{children}</DefaultLayout>;
}
