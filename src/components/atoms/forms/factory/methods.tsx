'use client';
import sum from 'lodash/sum';
import { use } from 'react';
import { type FieldValues, type Path, useWatch } from 'react-hook-form';
// import { TextEditor } from '@/components/atoms/text-editor';
import { Text } from '@/components/atoms/content';
import DatePicker from '@/components/atoms/datepicker/datepicker';
// import { Divider } from '@/components/atoms/divider';
// import { Input, Textarea } from '@/components/atoms/forms';
// import { CurrencyInput } from '@/components/atoms/forms/currency-input';
// import { AttachmentUploader, AvatarUploader } from '@/components/atoms/forms/uploader';
// import { PhoneNumberInput } from '@/components/atoms/phone-input';
import type { Option } from '@/components/atoms/react-select';
import {
  CreatableSelect,
  groupSelectedOptions,
  handleMultiSelect,
  handleOnChange,
  handleSelected,
  ReactSelect,
} from '@/components/atoms/react-select';
// import { CreateNotesCardForm } from '@/components/molecules/notes/create-notes-card';
// import { SortableApprovers } from '@/components/molecules/sortable-list';
import { Button } from '@/components/ui/button';
// import { FormControl, FormField, FormItem, useFormField } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
// import { cn } from '@/lib/utils';
import { dayFormat } from '@/lib/utils/format-date';
// import { parseToFloat } from '@/lib/utils/math-utils';
import { DataProviderContext } from '@/providers/data.provider';
import type { FormFieldDef } from '@/components/atoms/forms/factory/types';

// import { CustomDatePicker } from '@/components/ui/datepicker';

import dynamic from 'next/dynamic';
import { RenderComponentWithProps } from '@/components/atoms/render-component-with-props';
import { cn } from '@/lib/utils/cn';
// import { Divider } from '@/components/atoms/divider';
import {
  Input,
  Textarea,
  PhoneNumberInput,
  Divider,
} from '@/components/atoms/forms';
import { FormControl, FormField, FormItem, useFormField } from '@/components/ui/form';
// import { PhoneNumberInput } from '../../phone-input';
// import { Textarea } from '@/components/ui/textarea';
// import { TimePicker } from '@/components/ui/date-time';
// import RatingInput from '@/components/ui/rating';
// import { MAX_FILE_SIZE } from '@/config/file';
// import type { TAttachedFile } from '@/lib/validations/files.schema';

const TextEditor = dynamic(
  () => import('@/components/atoms/text-editor').then((mod) => mod.TextEditor),
  {
    ssr: false,
  }
);

type FieldPropsType = {
  [key: string]: FIX_ME;
};

// Automatic filtering function - works under the hood
// Simple unique filtering function
function filterUniqueOptions(
  options: Option[],
  allRowValues: any[],
  currentIndex: number,
  fieldName: string
): Option[] {
  // Get all selected values from other rows (excluding current row)
  const selectedValues = allRowValues
    .filter((_, idx) => idx !== currentIndex)
    .map((row: any) => row?.[fieldName])
    .filter(Boolean);

  // Filter out already selected values
  return options.filter((option) => !selectedValues.includes(option.value));
}

export const methods = {
  empty: ({ name, className, ...props }: FieldPropsType) => (
    <div className={cn(className)} {...props} />
  ),
  divider: ({ ...props }: FieldPropsType) => <Divider {...props} />,
  description: ({ inputProps, ...props }: FieldPropsType) => (
    <Text {...props}>{inputProps.text}</Text>
  ),
  autofill: ({ props }: FieldPropsType) => <Autofill {...props} />,
  submit: ({ name, className, ...props }: FieldPropsType) => (
    <div className={cn(className)}>
      <Button {...props}>{name}</Button>
    </div>
  ),
  component: ({ inputProps, ...otherProps }: FieldPropsType) => {
    const { component, ...props } = { ...otherProps, ...inputProps };
    return <RenderComponentWithProps as={component} {...props} />;
  },
  header: ({ name, fetchedProps, className, ...props }: FieldPropsType) => {
    return (
      <div
        className={cn(
          'flex h-9 w-full cursor-not-allowed items-center rounded-md border border-input bg-slate-100 px-3 py-1 font-medium text-sm shadow-sm transition-colors',
          className
        )}
        {...props}
      >
        {name}
      </div>
    );
  },
  text: ({ fetchedProps, callback, index, rowData, name, ...field }: FieldPropsType) => {
    return (
      <Input
        {...field}
        type={field.type}
        placeholder={field.placeholder}
        isRequired={field.isRequired}
        onChange={({ target: { value } }) => {
          field.onChange(value);

          if (callback) {
            // Create updated row data with the new value
            const fieldName = name.split('.').pop();
            const updatedRow = { ...rowData, [fieldName]: value };
            callback(value, index, updatedRow);
          }
        }}
      />
    );
  },
  password: ({ fetchedProps, callback, index, rowData, name, ...field }: FieldPropsType) => {
    return (
      <Input
        {...field}
        type={field.type}
        placeholder={field.placeholder}
        isRequired={field.isRequired}
        onChange={({ target: { value } }) => {
          field.onChange(value);

          if (callback) {
            const fieldName = name.split('.').pop();
            const updatedRow = { ...rowData, [fieldName]: value };
            callback(value, index, updatedRow);
          }
        }}
      />
    );
  },
  number: ({ fetchedProps, index, callback, rowData, name, ...field }: FieldPropsType) => {
    return (
      <Input
        {...field}
        className={cn('appearance-none', field.className)}
        type={field.type}
        placeholder={field.placeholder}
        isRequired={field.isRequired}
        onChange={({ target: { value } }) => {
          const numValue = Number(value);
          field.onChange(numValue);

          if (callback) {
            const fieldName = name.split('.').pop();
            const updatedRow = { ...rowData, [fieldName]: numValue };
            callback(numValue, index, updatedRow);
          }
        }}
      />
    );
  },
  phoneNumber: ({ fetchedProps, callback, index, rowData, name, ...field }: FieldPropsType) => {
    return (
      <FormControl>
        <PhoneNumberInput
          {...field}
          placeholder={field.placeholder}
          isRequired={field.isRequired}
          onChange={(value) => {
            field.onChange(value);

            if (callback) {
              const fieldName = name.split('.').pop();
              const updatedRow = { ...rowData, [fieldName]: value };
              callback(value, index, updatedRow);
            }
          }}
        />
      </FormControl>
    );
  },
  textarea: ({ fetchedProps, callback, index, rowData, name, ...field }: FieldPropsType) => {
    return (
      <FormControl>
        <Textarea
          {...field}
          onChange={({ target: { value } }) => {
            field.onChange(value);

            if (callback) {
              const fieldName = name.split('.').pop();
              const updatedRow = { ...rowData, [fieldName]: value };
              callback(value, index, updatedRow);
            }
          }}
        />
      </FormControl>
    );
  },
  // currency: ({ fetchedProps, callback, index, rowData, name, ...field }: FieldPropsType) => {
  //   return (
  //     <CurrencyInput
  //       {...field}
  //       onChange={({ target: { value } }) => {
  //         const parsedValue = parseToFloat(value);
  //         field.onChange(parsedValue);

  //         if (callback) {
  //           const fieldName = name.split('.').pop();
  //           const updatedRow = { ...rowData, [fieldName]: parsedValue };
  //           callback(parsedValue, index, updatedRow);
  //         }
  //       }}
  //     />
  //   );
  // },
  date: ({ index, fetchedProps, callback, rowData, name, ...field }: FieldPropsType) => {
    const {
      ref,
      error,
      label,
      value,
      onChange,
      isRequired,
      showYearPicker,
      placeholder,
      isClearable,
      minDate,
      maxDate,
      dateFormat,
      helperText,
    } = field;

    return (
      <DatePicker
        ref={ref}
        {...field}
        selected={value}
        onChange={(date: Date) => {
          onChange(date);

          if (callback) {
            const fieldName = name.split('.').pop();
            const updatedRow = { ...rowData, [fieldName]: date };
            callback(date, index, updatedRow);
          }
        }}
        placeholderText={placeholder}
        showYearPicker={showYearPicker}
        // inputProps={{
        //   error,
        //   label,
        //   isRequired,
        //   helperText,
        //   variant: field.variant,
        //   clearable: isClearable,
        //   onClear: () => {
        //     onChange(null);

        //     if (callback) {
        //       const fieldName = name.split('.').pop();
        //       const updatedRow = { ...rowData, [fieldName]: null };
        //       callback(null, index, updatedRow);
        //     }
        //   },
        // }}
        minDate={minDate}
        maxDate={maxDate}
        dateFormat={dateFormat}
      />
    );
  },
  dateRange: ({ index, fetchedProps, callback, rowData, name, ...field }: FieldPropsType) => {
    const { error, label, value, showTimeSelect, dateFormat, onChange } = field;

    return (
      <DatePicker
        {...field}
        selectsRange
        selected={value?.[0] ? new Date(value[0]) : null}
        startDate={value?.[0] ? new Date(value[0]) : null}
        endDate={value?.[1] ? new Date(value[1]) : null}
        dateFormat={dateFormat ?? dayFormat.dayShortMonthYear}
        onChange={(dates: [Date | null, Date | null]) => {
          const [start, end] = dates;
          const formattedRange = [
            start ? start.toISOString() : null,
            end ? end.toISOString() : null,
          ];

          onChange(formattedRange);

          if (callback) {
            const fieldName = name.split('.').pop();
            const updatedRow = { ...rowData, [fieldName]: formattedRange };
            callback(formattedRange, index, updatedRow);
          }
        }}
        className={cn('min-w-74')}
        showTimeSelect={showTimeSelect}
        // inputProps={{
        //   label,
        //   error,
        //   variant: field.variant,
        //   rounded: 'md',
        //   inputClassName: cn('rounded-md'),
        //   clearable: true,
        //   onClear: () => {
        //     onChange(null);

        //     if (callback) {
        //       const fieldName = name.split('.').pop();
        //       const updatedRow = { ...rowData, [fieldName]: null };
        //       callback(null, index, updatedRow);
        //     }
        //   },
        // }}
      />
    );
  },
  select: ({ index, callback, rowData, name, ...field }: FieldPropsType) => {
    const {
      value,
      onChange,
      fetchedProps,
      valueOnly = true,
      disabled,
      isLoading,
      allRowValues,
      fieldName,
      unique = false,
      mapOptionKeys = { label: 'label', value: 'value' },
    } = field;

    let options = Array.isArray(field.options) ? field.options : fetchedProps?.[field.options];

    // Automatically apply unique filtering if enabled
    if (unique && allRowValues && fieldName && typeof index === 'number') {
      options = filterUniqueOptions(options, allRowValues, index, fieldName);
    }

    const newOptions = options?.map((option: Option) => ({
      ...option,
      value: option[mapOptionKeys.value as keyof typeof option] as string,
      label: option[mapOptionKeys.label as keyof typeof option] as string,
    }));

    return (
      <ReactSelect
        onClear={() => {
          onChange(null);

          if (callback) {
            const fieldName = name.split('.').pop();
            const updatedRow = { ...rowData, [fieldName]: null };
            callback(null, index, updatedRow);
          }
        }}
        {...field}
        options={newOptions}
        isDisabled={disabled}
        isLoading={isLoading}
        value={valueOnly ? handleSelected(newOptions, value ?? '') : value}
        onChange={(newValue) => {
          const processedValue = valueOnly ? handleOnChange(newValue) : newValue;
          onChange(processedValue);

          if (callback) {
            const fieldName = name.split('.').pop();
            const updatedRow = { ...rowData, [fieldName]: processedValue };
            callback(newValue, index, updatedRow);
          }
        }}
      />
    );
  },
  // asyncSelect: ({ index, callback, rowData, name, ...field }: FieldPropsType) => {
  //   const {
  //     value,
  //     onChange,
  //     fetchedProps,
  //     valueOnly = false, // Changed to false for AsyncSelect
  //     disabled,
  //     isLoading,
  //     loadOptions,
  //     cacheOptions = true,
  //     defaultOptions = true,
  //     mapOptionKeys = { label: 'label', value: 'value' },
  //   } = field;
  //   const options = Array.isArray(field.options) ? field.options : fetchedProps?.[field.options];

  //   const newOptions = options?.map((option: Option) => ({
  //     ...option,
  //     value: option[mapOptionKeys.value as keyof typeof option] as string,
  //     label: option[mapOptionKeys.label as keyof typeof option] as string,
  //   }));

  //   console.log('newOptions', newOptions);

  //   return (
  //     <AsyncSelect
  //       {...field}
  //       isDisabled={disabled}
  //       isLoading={isLoading}
  //       loadOptions={loadOptions}
  //       cacheOptions={cacheOptions}
  //       defaultOptions={defaultOptions}
  //       value={value}
  //       onChange={(newValue) => {
  //         const processedValue = handleOnChange(newValue);
  //         onChange(processedValue);

  //         if (callback) {
  //           const fieldName = name.split('.').pop();
  //           const updatedRow = { ...rowData, [fieldName]: processedValue };
  //           callback(newValue, index, updatedRow);
  //         }
  //       }}
  //     />
  //   );
  // },
  creatableSelect: ({ index, callback, rowData, name, ...field }: FieldPropsType) => {
    const {
      value,
      onChange,
      fetchedProps,
      valueOnly = true,
      disabled,
      isLoading,
      allRowValues,
      loadOptions,
      mapOptionKeys = { label: 'label', value: 'value' },
    } = field;

    const options = Array.isArray(field.options) ? field.options : fetchedProps?.[field.options];

    const newOptions = options?.map((option: Option) => ({
      ...option,
      value: option[mapOptionKeys.value as keyof typeof option] as string,
      label: option[mapOptionKeys.label as keyof typeof option] as string,
    }));

    return (
      <CreatableSelect
        onClear={() => {
          onChange(null);

          if (callback) {
            const fieldName = name.split('.').pop();
            const updatedRow = { ...rowData, [fieldName]: null };
            callback(null, index, updatedRow);
          }
        }}
        isMulti
        isDisabled={disabled}
        isLoading={isLoading}
        onChange={(newValue) => {
          onChange(newValue);

          if (callback) {
            const fieldName = name.split('.').pop();
            const updatedRow = { ...rowData, [fieldName]: newValue };
            callback(newValue, index, updatedRow);
          }
        }}
        loadOptions={loadOptions}
        {...field}
      />
    );
  },
  multiselect: (field: FieldPropsType) => {
    const {
      fetchedProps,
      mapOptionKeys = { label: 'label', value: 'value' },
      callback,
      value,
      onChange,
      disabled,
      index,
      rowData,
      name,
    } = field;

    const fieldOptions = Array.isArray(field.options) ? field.options : fetchedProps[field.options];

    const newOptions = fieldOptions.map((option: Option) => ({
      value: option[mapOptionKeys.value as keyof typeof option] as string,
      label: option[mapOptionKeys.label as keyof typeof option] as string,
    }));

    const [groupOptions, options] = groupSelectedOptions(newOptions, value ?? []);

    return (
      <ReactSelect
        {...field}
        isMulti
        options={groupOptions}
        value={handleMultiSelect(options, value ?? [])}
        isDisabled={disabled}
        onChange={(newValue, actionMeta) => {
          const processedValue = handleOnChange(newValue);
          onChange(processedValue);

          if (callback) {
            const fieldName = name.split('.').pop();
            const updatedRow = { ...rowData, [fieldName]: processedValue };
            callback(newValue, index, updatedRow);
          }
        }}
      />
    );
  },
  switch: ({
    value,
    onChange,
    label,
    fetchedProps,
    callback,
    isRequired,
    index,
    rowData,
    name,
    ...field
  }: FieldPropsType) => {
    return (
      <FormControl>
        <Switch
          label={
            <>
              {label} {isRequired && <span className="text-red-500 dark:text-red-dark">*</span>}
            </>
          }
          checked={value}
          onChange={(value) => {
            onChange(value);

            if (callback) {
              const fieldName = name.split('.').pop();
              const updatedRow = { ...rowData, [fieldName]: value };
              callback(value, index, updatedRow);
            }
          }}
          {...field}
          type="button"
        />
      </FormControl>
    );
  },
  // time: ({ fetchedProps, index, callback, rowData, name, ...field }: FieldPropsType) => {
  //   const { onClear, onChange, ...rest } = field;

  //   return (
  //     <TimePicker
  //       onClear={() => {
  //         if (onClear) {
  //           onClear(index);
  //         }

  //         if (callback) {
  //           const fieldName = name.split('.').pop();
  //           const updatedRow = { ...rowData, [fieldName]: null };
  //           callback(null, index, updatedRow);
  //         }
  //       }}
  //       onChange={(value) => {
  //         onChange(value);

  //         if (callback) {
  //           const fieldName = name.split('.').pop();
  //           const updatedRow = { ...rowData, [fieldName]: value };
  //           callback(value, index, updatedRow);
  //         }
  //       }}
  //       {...rest}
  //       type="text"
  //     />
  //   );
  // },
  // approver: ({
  //   value,
  //   onChange,
  //   label,
  //   error,
  //   users,
  //   callback,
  //   index,
  //   rowData,
  //   name,
  //   ...field
  // }: FieldPropsType) => {
  //   return (
  //     <FormControl>
  //       <SortableApprovers
  //         value={value ?? []}
  //         onChange={(newValue) => {
  //           onChange(newValue);

  //           if (callback) {
  //             const fieldName = name.split('.').pop();
  //             const updatedRow = { ...rowData, [fieldName]: newValue };
  //             callback(newValue, index, updatedRow);
  //           }
  //         }}
  //         error={error}
  //         users={users}
  //         name={field.name}
  //       />
  //     </FormControl>
  //   );
  // },
  // note: ({ user, ...field }: FieldPropsType) => {
  //   return <CreateNotesCardForm user={user} />;
  // },
  // upload: (field: FieldPropsType) => {
  //   const {
  //     value = [],
  //     onChange,
  //     label,
  //     accept,
  //     multiple,
  //     maxSize = MAX_FILE_SIZE,
  //     placeholder,
  //     error,
  //     callback,
  //     index,
  //     rowData,
  //     name,
  //     disableDelete,
  //     deleteDisabledMessage,
  //   } = field;

  //   const handleSuccess = (newFiles: TAttachedFile[]) => {
  //     const mergedData = [...value, ...newFiles];
  //     onChange(mergedData);
  //   };

  //   return (
  //     <AttachmentUploader
  //       name={field.name}
  //       label={label}
  //       value={value}
  //       // add fallback for breaking change
  //       onSuccess={multiple ? handleSuccess : onChange}
  //       placeholder={placeholder}
  //       error={error}
  //       options={{
  //         accept,
  //         maxSize,
  //       }}
  //       disableDelete={disableDelete}
  //       deleteDisabledMessage={deleteDisabledMessage}
  //     />
  //   );
  // },
  // avatar: (field: FieldPropsType) => {
  //   const { value, onChange } = field;
  //   // console.log('field', field);

  //   return (
  //     <AvatarUploader
  //       value={value}
  //       onSuccess={(uploadedFiles) => {
  //         const avatar = uploadedFiles[0].previewUrl;
  //         onChange(avatar);
  //       }}
  //     />
  //   );
  // },
  textEditor: (field: FieldPropsType) => {
    const { onChange, callback, index, rowData, name, ...rest } = field;

    return (
      <TextEditor
        {...rest}
        onChange={(value) => {
          onChange(value);

          if (callback) {
            const fieldName = name.split('.').pop();
            const updatedRow = { ...rowData, [fieldName]: value };
            callback(value, index, updatedRow);
          }
        }}
      />
    );
  },
  // rating: ({
  //   isRequired,
  //   disabled,
  //   error,
  //   label,
  //   onChange,
  //   callback,
  //   index,
  //   rowData,
  //   name,
  //   ...field
  // }: FieldPropsType) => {
  //   return (
  //     <FormControl>
  //       <RatingInput
  //         disabled={disabled}
  //         inputProps={{
  //           isRequired,
  //           label,
  //           disabled,
  //           error,
  //         }}
  //         {...field}
  //         onChange={(value) => {
  //           onChange(value);

  //           if (callback) {
  //             const fieldName = name.split('.').pop();
  //             const updatedRow = { ...rowData, [fieldName]: value };
  //             callback(value, index, updatedRow);
  //           }
  //         }}
  //       />
  //     </FormControl>
  //   );
  // },

  // conditional fields
  conditional: ({
    conditions,
    defaultField,
    rowValue,
    index,
    callback,
    rowData,
    ...props
  }: FieldPropsType): React.ReactElement | null => {
    // Find the first condition that matches
    const matchedCondition = conditions?.find((condition: any) => condition.when(rowValue, index));
    const fieldsToRender = matchedCondition?.field || defaultField;

    if (fieldsToRender && Array.isArray(fieldsToRender)) {
      return (
        <>
          {fieldsToRender.map((field, fieldIndex) =>
            methods[field.type as keyof typeof methods]({
              ...props,
              ...field,
              callback, // Pass callback to conditional fields
              rowData, // Pass rowData to conditional fields
              key: `${field.name}-${fieldIndex}`,
            })
          )}
        </>
      );
    }

    return null;
  },
};

function Autofill({ mapField, className, callback, ...props }: FieldPropsType) {
  const fields = useWatch({ name: props.fields });
  const autoFillClassName = 'bg-steel-50 dark:bg-dark-200 cursor-not-allowed';

  if (mapField) {
    const output = sum(fields.map((field: FIX_ME) => +field[mapField]));
    return <div className={cn(autoFillClassName, className)}>{output}</div>;
  }

  const output = callback?.(fields);
  return <div className={cn(autoFillClassName, className)}>{output}</div>;
}

// interface FormFieldWrapperProps<TFieldValues extends FieldValues> {
//   // form: UseFormReturn<TFieldValues>
//   type: keyof typeof methods | "fieldArray";
//   name: keyof TFieldValues;
//   label?: string;
//   placeholder?: string;
//   defaultValue?: string;
//   description?: string;
//   className?: string;

//   // children: React.ReactNode
// }
export function FormFieldWrapper<TFieldValues extends FieldValues>(
  props: FormFieldDef<TFieldValues> & {
    index?: number;
    rowData?: any;
  }
) {
  if (['empty', 'header', 'submit', 'autofill', 'description'].includes(props.type)) {
    return methods[props.type as keyof typeof methods](props);
  }

  // console.log('FieldWrapperProps', props);
  const fetchedProps = use(DataProviderContext);
  const { className, inputProps, rowData, ...restProps } = props;
  // console.log('inputProps', inputProps);
  // console.log('FormFieldProps', props);
  return (
    <FormField
      name={props.name as Path<TFieldValues>}
      render={({ field }) => {
        // console.log('field', field);
        return (
          <FormItem className={cn('flex flex-col', className)}>
            {/* {label && <FormLabel>{label}</FormLabel>} */}
            {FieldMethodWrapper({
              fieldProps: props,
              methods,
              field,
              inputProps,
              restProps,
              fetchedProps,
              className,
              rowData,
            })}
            {/* <FormMessage className="border-t mt-0 px-2 py-1.5 bg-red-50 h-full flex items-center" /> */}
            {/* {description && <FormDescription>{description}</FormDescription>} */}
          </FormItem>
        );
      }}
    />
  );
}

function FieldMethodWrapper({
  fieldProps,
  methods,
  field,
  inputProps,
  restProps,
  fetchedProps,
  className,
  rowData,
}: any) {
  const { error, formMessageId } = useFormField();
  // console.log('error', error);

  return methods[fieldProps.type as keyof typeof methods]({
    ...field,
    error: error?.message,
    ...inputProps,
    ...restProps,
    fetchedProps,
    rowData,
  });
}
