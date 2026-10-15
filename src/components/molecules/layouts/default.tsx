import SidebarProvider from '@/components/molecules/sidebar/dashboard-sidebar';
import { SheetProvider } from '@/components/organisms/sheet';

interface DefaultLayoutPropTypes {
  children: React.ReactNode;
}

export default function DefaultLayout({ children }: DefaultLayoutPropTypes) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <SidebarProvider>{children}</SidebarProvider>
      <SheetProvider />
    </div>
  );
}
