import SidebarProvider from '@/components/molecules/sidebar/dashboard-sidebar';

interface DefaultLayoutPropTypes {
  children: React.ReactNode;
}

export default function DefaultLayout({ children }: DefaultLayoutPropTypes) {
  return <SidebarProvider>{children}</SidebarProvider>;
}
