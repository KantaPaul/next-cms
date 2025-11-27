'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { BackButton } from '@/components/atoms/buttons/back-button';
// import { Button } from '@/components/atoms/button/button';
// import { FormFactory } from '@/components/form/factory';
// import { FieldFactory } from '@/components/form/factory/field-factory';
// import { StickyFooter } from '@/components/molecules/sticky-footer';
import { MESSAGES } from '@/config/messages';
import { PAGES } from '@/config/pages';
// import { handleActionResponse } from '@/lib/utils/handle-action-response';
import { useDataProvider } from '@/providers/data.provider';
import { FormFactory } from '@/components/atoms/forms/factory';
import type { CreatePagesInput } from '@/db/validations/pages.validation';
import { createPagesSchema } from '@/db/validations/pages.validation';
import { MainEditor } from '@/app/(admin)/dashboard/pages/_components/main-editor';
import { SidebarEditor } from '@/app/(admin)/dashboard/pages/_components/sidebar-editor';
import { StickyFooter } from '@/components/atoms/sticky-footer';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { handleActionResponse } from '@/lib/utils/handle-action-response';
import {
  createPage,
  updatePage,
} from '@/app/(admin)/dashboard/pages/_modules/pages.actions';
// import { createShift, updateShift } from './_modules/shift.actions';
// import type { GetShift } from './_modules/shift.queries';
// import { type CreateShiftInput, createShiftSchema } from './_modules/shift.schema';

type CreateOrUpdateFormProps = {
  id: string;
};

interface ShiftDataProvider {
  initialValues?: any;
}

export default function CreateOrUpdateForm({ id }: CreateOrUpdateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { initialValues } = useDataProvider<ShiftDataProvider>();

  function onSubmit(inputs: CreatePagesInput) {
    startTransition(async () => {
      const response = initialValues
        ? await updatePage({ ...inputs, id: initialValues.id })
        : await createPage(inputs);

      handleActionResponse(response, () => {
        initialValues
          ? toast.success(
              MESSAGES.MODULE_ACTION_SUCCESSFULLY('Pages', 'updated')
            )
          : toast.success(
              MESSAGES.MODULE_ACTION_SUCCESSFULLY('Pages', 'created')
            );
        router.push(PAGES.DASHBOARD.PAGES.INDEX);
      });
    });
  }

  return (
    <>
      <FormFactory<CreatePagesInput>
        onSubmit={onSubmit}
        id={id}
        defaultValues={
          {
            // name: initialValues?.name ?? '',
          }
        }
        schema={createPagesSchema}
        className="h-full"
      >
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <MainEditor />
          </div>
          <div className="w-80 border-l border-gray-200 bg-white">
            <SidebarEditor />
          </div>
        </div>
      </FormFactory>
      {/* <FormFactory<CreateShiftInput>
        onSubmit={onSubmit}
        id={id}
        defaultValues={{
          name: initialValues?.name ?? '',
        }}
        schema={createShiftSchema}
      >
        <FieldFactory<CreateShiftInput>
          className="gap-4"
          fields={[
            [
              {
                name: 'name',
                label: 'Type',
                type: 'text',
                className: 'col-span-full',
                isRequired: true,
              },
            ],
          ]}
        />
      </FormFactory>
      <StickyFooter>
        <BackButton disabled={isPending} />
        <Button type="submit" form={id} disabled={isPending} isLoading={isPending}>
          Save
        </Button>
      </StickyFooter> */}
      <StickyFooter>
        <BackButton disabled={isPending} />
        <Button
          type="submit"
          form={id}
          disabled={isPending}
          // isLoading={isPending}
        >
          Save
        </Button>
      </StickyFooter>
    </>
  );
}
