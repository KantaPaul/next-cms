import type { Option } from './select';

export function handleSelected(
  selectOptions: Option[],
  value: string
): Option | string {
  return selectOptions?.find(opt => opt.value === value) ?? '';
}

export function handleMultiSelect(
  selectOptions: Option[],
  values: string[]
): Option[] {
  return selectOptions.filter(option => values?.includes(option.value));
}

export function handleOnChange(newValue: unknown): string | string[] | {} {
  if (Array.isArray(newValue)) {
    return newValue ? (newValue as Option[]).map(opt => opt.value) : [];
  }

  return newValue ? (newValue as Option).value : {};
}

export const groupSelectedOptions = (options: Option[], value: string[]) => {
  const [selected, others] = options.reduce(
    (acc, curr) => {
      if (value?.includes(curr.value)) {
        acc[0].push(curr);
      } else {
        acc[1].push(curr);
      }

      return acc;
    },
    [[], []] as [typeof options, typeof options]
  );

  const groupOptions = [
    {
      options: selected,
      label: 'Selected',
    },
    {
      options: others,
      label: 'Options',
    },
  ];

  const combinedOptions = [...selected, ...others];

  return [groupOptions, combinedOptions] as const;
};

export const createOption = (label: string) => ({
  label,
  value: label.toLowerCase().replace(/\W/g, ''),
});

export const getReadonlyProps = (readOnly: boolean) => {
  return {
    isClearable: !readOnly,
    isSearchable: !readOnly,
    openMenuOnClick: !readOnly,
  };
};
