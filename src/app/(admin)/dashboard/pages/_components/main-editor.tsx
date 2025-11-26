import { FieldFactory } from '@/components/atoms/forms/factory/field-factory';
import type { CreatePagesInput } from '@/app/(admin)/dashboard/pages/_modules/pages.validation';
import { cn } from '@/lib/utils/cn';

export const MainEditor = ({className, ...props}: React.ComponentProps<"div">) => {
  return (
    <div
      className={cn('mx-auto w-full max-w-4xl px-12 py-8', className)}
      {...props}
    >
      <FieldFactory<CreatePagesInput>
        variant="default"
        className="sm:grid-cols-1 2xl:grid-cols-1"
        fields={[
          [
            {
              name: 'title',
              //   label: 'Title',
              type: 'text',
              placeholder: 'Add Title',
              className:
                '[&>div]:max-w-full [&>div>input]:text-4xl [&>div>input]:h-auto [&>div>input]:p-0 [&>div>input]:shadow-none [&>div>input]:border-0 [&>div>input]:outline-none [&>div>input]:focus-visible:outline-none [&>div>input]:focus-visible:ring-0 font-bold',
            },
            {
              name: 'content',
              //   label: 'Title',
              type: 'textEditor',
            //   placeholder: 'Add Title',
            },
          ],
        ]}
      />
    </div>
  );
};
