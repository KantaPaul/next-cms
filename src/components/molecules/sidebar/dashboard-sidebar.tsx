import { AppSidebar } from "@/components/molecules/sidebar/app-sidebar";
import {
  SidebarInset,
  SidebarProvider as AppSidebarProvider,
} from "@/components/ui/sidebar";
import Header from "@/components/organisms/header/header";
import { redirect } from "next/navigation";
import { getSession } from "@/server/actions/auth.actions";

export default async function SidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  return (
    <AppSidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="dark:bg-dark-50 @container flex h-full flex-1 flex-col bg-white p-5 has-[.sticky-footer]:pb-28 xl:p-8">
          {children}
        </div>
      </SidebarInset>
    </AppSidebarProvider>
  );
}
