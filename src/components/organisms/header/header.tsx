import { Box, Flex } from "@/components/atoms/layout";
import AuthDropdown from "@/components/molecules/auth-dropdown/auth-dropdown";
import { Logo } from "@/components/molecules/logo";
// import { TopBarPanel } from "@/components/molecules/topbar-panel";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from '@/components/atoms/theme-toggle';

import { cn } from '@/lib/utils/cn';
import { me } from '@/server/actions/auth.actions';

export default async function Header() {
  const [currentUser] = await Promise.all([me()]);
  const { user, profile } = currentUser;

  return (
    <header
      className={cn(
        'border-steel-200/70 dark:border-dark-300 dark:bg-dark-100 flex h-16 shrink-0 items-center gap-4 border-b bg-white px-5 transition-[width,height] ease-linear xl:px-8',
        //group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12
        'sticky inset-x-0 top-0 z-50'
      )}
    >
      {/* <SidebarTrigger className="ml-1" /> */}

      <SidebarTrigger />
      <Flex justify="between" className="h-full gap-3 pl-1">
        <Logo className="order-2 block md:ms-1 lg:hidden" />

        <Flex
          justify="end"
          className="order-3 ml-auto flex w-auto items-center gap-0.5 md:gap-4 lg:gap-7"
        >
          <ThemeToggle />
          {/* <TopBarPanel /> */}
          {/* <Box className="order-2 ml-1 items-center justify-center md:order-0 md:ml-0 lg:flex"> */}
          <AuthDropdown user={user} />
          {/* </Box> */}
        </Flex>
      </Flex>
    </header>
  );
}
