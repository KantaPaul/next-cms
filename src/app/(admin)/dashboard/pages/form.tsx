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
import type { CreatePagesInput } from '@/app/(admin)/dashboard/pages/_modules/pages.validation';
import { createPagesSchema } from '@/app/(admin)/dashboard/pages/_modules/pages.validation';
import { MainEditor } from '@/app/(admin)/dashboard/pages/_components/main-editor';
import { SidebarEditor } from '@/app/(admin)/dashboard/pages/_components/sidebar-editor';
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

  // function onSubmit(inputs: CreateShiftInput) {
  //   startTransition(async () => {
  //     const response = initialValues
  //       ? await updateShift({ ...inputs, id: initialValues.id })
  //       : await createShift(inputs);

  //     handleActionResponse(response, () => {
  //       initialValues
  //         ? toast.success(MESSAGES.MODULE_ACTION_SUCCESSFULLY('Shift', 'updated'))
  //         : toast.success(MESSAGES.MODULE_ACTION_SUCCESSFULLY('Shift', 'created'));
  //       router.push(PAGES.DASHBOARD.HRM.SHIFTS.INDEX);
  //     });
  //   });
  // }

  return (
    <>
      <FormFactory<CreatePagesInput>
        onSubmit={() => console.log('void')}
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
    </>
  );
}
