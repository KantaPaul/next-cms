import omit from 'lodash/omit';
import { Plus } from 'lucide-react';
import {
  type ClearIndicatorProps,
  type ControlProps,
  components,
  type DropdownIndicatorProps,
  type GroupBase,
  type LoadingIndicatorProps,
  type MultiValueProps,
  type OptionProps,
  type PlaceholderProps,
  type SingleValueProps,
} from 'react-select';
import { Text } from '@/components/atoms/content';
import { Checkbox } from '@/components/atoms/forms';
import { Spinner } from '@/components/atoms/icons/loader/spinner';
import { Box } from '@/components/atoms/layout';
import Link from '@/components/atoms/next/link';
import type { Option as SelectOption } from '@/components/atoms/react-select';
import { ClearButton, DropdownIndicator as DropdownIndicatorButton } from '@/components/atoms/buttons';
import { cn } from '@/lib/utils/cn';

function PrefixWrapper({ children }: { children: React.ReactNode }) {
  return <span className="me-2 whitespace-nowrap text-steel-400 leading-normal">{children}</span>;
}

export interface CustomPlaceholderProps<
  SelectOption,
  IsMulti extends boolean,
  Group extends GroupBase<SelectOption>,
> extends PlaceholderProps<SelectOption, IsMulti, Group> {
  prefix?: React.ReactNode;
}

export function Placeholder<
  SelectOption,
  IsMulti extends boolean,
  Group extends GroupBase<SelectOption>,
>({ prefix, children, ...props }: CustomPlaceholderProps<SelectOption, IsMulti, Group>) {
  return (
    <components.Placeholder {...props}>
      {prefix && <PrefixWrapper>{prefix}</PrefixWrapper>}
      {children}
    </components.Placeholder>
  );
}

export interface CustomControlProps<
  SelectOption,
  IsMulti extends boolean,
  Group extends GroupBase<SelectOption>,
> extends ControlProps<SelectOption, IsMulti, Group> {
  isReadOnly?: boolean;
}

export function Control<
  SelectOption,
  IsMulti extends boolean,
  Group extends GroupBase<SelectOption>,
>({ isReadOnly, ...props }: CustomControlProps<SelectOption, IsMulti, Group>) {
  return <components.Control {...props} />;
}

export interface CustomSingleValueProps<
  SelectOption,
  IsMulti extends boolean,
  Group extends GroupBase<SelectOption>,
> extends SingleValueProps<SelectOption, IsMulti, Group> {
  prefix?: React.ReactNode;
}

export function SingleValue<Option, IsMulti extends boolean, Group extends GroupBase<Option>>({
  prefix,
  children,
  ...props
}: CustomSingleValueProps<Option, IsMulti, Group>) {
  return (
    <components.SingleValue {...props}>
      {prefix && <PrefixWrapper>{prefix}</PrefixWrapper>}
      {children}
    </components.SingleValue>
  );
}

export function LoadingIndicator<Option, IsMulti extends boolean, Group extends GroupBase<Option>>(
  props: LoadingIndicatorProps<Option, IsMulti, Group>
) {
  return <Spinner className={cn('size-4', props.className)} />;
}

/**
 * Custom ValueContainer
 * @link https://github.com/JedWatson/react-select/issues/3856#issuecomment-744746113
 */

// function SelectedCounter({ count }: { count: number }) {
//   return <span className="ms-1 text-sm text-steel-700">+ {count}</span>;
// }
// export const ValueContainer = ({
//   children,
//   ...props
// }: ValueContainerProps<unknown>) => {
//   if (Array.isArray(children)) {
//     const CHIPS_LIMIT = 1;

//     const [chips, otherChildren] = children;
//     const overflowCounter = chips.slice(CHIPS_LIMIT).length;
//     // to display last selected item + counter
//     // const displayChips = chips.slice(
//     //   overflowCounter,
//     //   overflowCounter + CHIPS_LIMIT
//     // );
//     // to display first selected item + counter
//     const displayChips = chips.slice(0, CHIPS_LIMIT);

//     return (
//       <components.ValueContainer {...props}>
//         {displayChips}
//         {overflowCounter > 0 && <SelectedCounter count={overflowCounter} />}
//         {otherChildren}
//       </components.ValueContainer>
//     );
//   } else {
//     // Handle single child case (optional)
//     return (
//       <components.ValueContainer {...props}>
//         {children}
//       </components.ValueContainer>
//     );
//   }
// };
export interface CustomClearIndicatorProps<
  Option,
  IsMulti extends boolean,
  Group extends GroupBase<Option>,
> extends ClearIndicatorProps<Option, IsMulti, Group> {
  onClear?: () => void;
}

export function ClearIndicator<Option, IsMulti extends boolean, Group extends GroupBase<Option>>({
  onClear,
  ...props
}: CustomClearIndicatorProps<Option, IsMulti, Group>) {
  const clearValue = (event: React.MouseEvent | React.TouchEvent) => {
    // Prevent the default behavior which might be causing the dropdown to open
    event.preventDefault();
    event.stopPropagation();

    props.clearValue();
    onClear && onClear();
  };

  const innerProps = {
    ...props.innerProps,
    onMouseDown: clearValue,
    onTouchEnd: clearValue,
  };

  return (
    <components.ClearIndicator {...props} innerProps={innerProps}>
      <ClearButton />
    </components.ClearIndicator>
  );
}

export function DropdownIndicator<Option, IsMulti extends boolean, Group extends GroupBase<Option>>(
  props: DropdownIndicatorProps<Option, IsMulti, Group>
) {
  return (
    <components.DropdownIndicator {...props}>
      <DropdownIndicatorButton />
    </components.DropdownIndicator>
  );
}

/**
 * Custom Option component for react-select
 * Handles regular options, link options (non-selectable), creatable options, and "Select All" functionality
 */
export function CustomOption<Option, IsMulti extends boolean, Group extends GroupBase<Option>>(
  props: OptionProps<Option, IsMulti, Group>
) {
  const { isLink, icon: hasIcon, __isNew__: isNew } = props.data as SelectOption;

  // Determine if this is the "Select All" option
  const isSelectAllOption = props.data && (props.data as unknown as SelectOption).value === '*';

  // Handle "Select All" checkbox state
  let isChecked = props.isSelected;

  // If this is the "Select All" option, we need special handling
  if (isSelectAllOption) {
    // Check if all other options are selected (excluding the "Select All" option itself)
    const allOptions = props.selectProps.options || [];
    const selectedOptions = props.selectProps.value || [];

    // Count all regular options (not Select All)
    const regularOptionsCount = Array.isArray(allOptions)
      ? allOptions.filter((opt) => (opt as SelectOption).value !== '*').length
      : 0;

    // Count selected regular options
    const selectedRegularCount = Array.isArray(selectedOptions)
      ? selectedOptions.filter((opt) => (opt as SelectOption).value !== '*').length
      : 0;

    // Consider "Select All" checked if all regular options are selected
    // or if the "Select All" option itself is explicitly selected
    isChecked =
      regularOptionsCount > 0 && (selectedRegularCount === regularOptionsCount || props.isSelected);
  }

  const optionContent = (
    <>
      {/* Show checkbox for multi-select options, but not for new/creatable or link options */}
      {props.isMulti && !isNew && !isLink && (
        <Checkbox
          type="checkbox"
          className="pointer-events-none"
          checked={isChecked}
          onChange={() => null}
        />
      )}
      {hasIcon ? (
        <>
          {(props.data as SelectOption).icon}
          {props.label}
        </>
      ) : (
        <>
          {/* Add plus sign if isNew for creatable */}
          {isNew && <Plus size={15} />}
          <Text>{props.label}</Text>
        </>
      )}
    </>
  );

  return (
    <components.Option
      className={cn('flex! items-center gap-2', props.className)}
      {...props}
      innerProps={{
        ...props.innerProps,
        onClick: (e) => {
          // Prevent selection for link options - they should only navigate, not be selected
          if (isLink) {
            // e.stopPropagation();
          } else {
            props.innerProps.onClick?.(e);
          }
        },
      }}
    >
      {/* Render as Link component for link options, otherwise render content directly */}
      {isLink ? (
        <Link
          href={(props.data as SelectOption).value}
          className={cn(hasIcon && 'flex items-center gap-2')}
        >
          {optionContent}
        </Link>
      ) : (
        optionContent
      )}
    </components.Option>
  );
}

/**
 *
 * @link https://github.com/JedWatson/react-select/issues/4845#issuecomment-939037362
 *
 */

export interface CustomMultiValueProps<
  Option,
  IsMulti extends boolean,
  Group extends GroupBase<Option>,
> extends MultiValueProps<Option, IsMulti, Group> {
  hideCount?: boolean;
  selectedItemCount?: number;
}

export function MultiValue<Option, IsMulti extends boolean, Group extends GroupBase<Option>>({
  hideCount = false,
  selectedItemCount,
  ...props
}: CustomMultiValueProps<Option, IsMulti, Group>) {
  const maxToShow = selectedItemCount || 1;
  const overflow = props
    .getValue()
    .slice(maxToShow)
    .map((x) => (x as SelectOption).label);

  if (props.index < maxToShow) {
    return <components.MultiValue {...props} />;
  }

  if (props.index === maxToShow && !hideCount) {
    return <SelectedCounter count={overflow.length} />;
  }

  return null;
}

function SelectedCounter({ count }: { count: number }) {
  return (
    <span className="proa-rs-selected-count ms-1 flex items-center whitespace-nowrap text-sm text-steel-700 dark:text-steel-200">
      + {count}
    </span>
  );
}

export const formatGroupLabel = (data: GroupBase<unknown>) => (
  <Box className="flex justify-between">
    <span>{data.label}</span>
    <span>{data.options.length}</span>
  </Box>
);
