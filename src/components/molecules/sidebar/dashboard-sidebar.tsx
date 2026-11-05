import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/molecules/sidebar/app-sidebar';
import Header from '@/components/organisms/header/header';
import {
  SidebarProvider as AppSidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import { getSession } from '@/server/actions/auth.actions';
import { collectionsService } from '@/server/services/collections.service';

/** Active post types for the sidebar; an empty list if they can't be loaded. */
async function sidebarPostTypes() {
  try {
    const rows = await collectionsService.list();
    return rows.map(c => ({ id: c.id, slug: c.slug, name: c.name, icon: c.icon }));
  } catch {
    return [];
  }
}

export default async function SidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect('/login');
  const postTypes = await sidebarPostTypes();

  return (
    <AppSidebarProvider>
      <AppSidebar postTypes={postTypes} />
      <SidebarInset>
        <Header />
        <div className="bg-background text-foreground @container flex h-full flex-1 flex-col p-5 has-[.sticky-footer]:pb-28 xl:p-8">
          {children}
        </div>
      </SidebarInset>
    </AppSidebarProvider>
  );
}
