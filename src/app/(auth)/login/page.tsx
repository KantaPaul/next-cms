import { LoginForm } from '@/components/templates/auth/login-form';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { metaObject } from '@/lib/utils/metadata';
import { siteSettingsService } from '@/server/services/site-settings.service';

export const metadata = {
  ...metaObject('Login'),
};

export default async function Page(props: {
  searchParams: Promise<{
    message?: string;
    [key: string]: string | undefined;
  }>;
}) {
  const searchParams = await props.searchParams;
  const authSettings = await siteSettingsService.getAuthSettings();

  if (!authSettings.loginEnabled) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Login Unavailable</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-2">
              {searchParams.message ||
                authSettings.loginDisabledMessage ||
                'Login is currently disabled.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <LoginForm message={searchParams.message} step={searchParams.step} />;
}
