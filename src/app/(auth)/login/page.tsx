import { LoginForm } from '@/components/templates/auth/login-form';
import { redirect, RedirectType } from 'next/navigation';

// import LoginView from "@/components/templates/auth/login";
import { metaObject } from '@/lib/utils/metadata';
// import { PAGES } from '@/config/pages';
// import { validateRequest } from "@/lib/auth/auth.actions";

export const metadata = {
  ...metaObject('Login'),
};

export default async function Page(props: {
  searchParams: Promise<{ message?: string; [key: string]: string | undefined }>;
}) {
  const searchParams = await props.searchParams;
  // const sessions = await validateRequest();

  // if (sessions) {
  //   redirect(PAGES.DASHBOARD.ROOT, RedirectType.replace);
  // }

  return <LoginForm />;
}
