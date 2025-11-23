import { useMemo } from 'react';
import {
  groupSelectedOptions,
  handleMultiSelect,
  handleOnChange,
  ReactSelect,
} from '@/components/atoms/react-select';
import { ARRAY_SEPARATOR } from '@/config/constant';
import { cn } from '@/lib/utils/cn';
import type { BaseFilterProps, Segment } from '../types';

interface SegmentFilterProps extends Omit<BaseFilterProps, 'config'> {
  isDrawer?: boolean;
  segments: Segment[];
  isPending?: boolean;
}

export function SegmentFilter({
  value,
  size,
  showLabel,
  className,
  isDrawer,
  segments,
  isPending,
  handlers,
}: SegmentFilterProps) {
  const activeSegments = useMemo(() => segments.filter((seg) => seg.active), [segments]);

  const selectedSegmentIds = useMemo(() => value?.split(ARRAY_SEPARATOR) ?? [], [value]);

  return (
    <div className={cn('grid gap-4', isDrawer ? 'grid-cols-1' : 'grid-cols-3', className)}>
      {activeSegments.map((segment) => {
        const segmentOptions = segment.attributes.map((attr) => ({
          label: attr.name,
          value: attr.id,
        }));

        const segmentSelectedIds = selectedSegmentIds.filter((id) =>
          segment.attributes.some((attr) => attr.id === id)
        );

        const [groupOptions, options] = groupSelectedOptions(segmentOptions, segmentSelectedIds);

        const handleClear = () => {
          const remainingIds = selectedSegmentIds.filter(
            (id) => !segment.attributes.some((attr) => attr.id === id)
          );

          if (remainingIds.length > 0) {
            handlers.setValue(remainingIds.join(ARRAY_SEPARATOR));
          } else {
            handlers.clear();
          }
        };

        const handleChange = (newValue: any) => {
          const selectedValues = handleOnChange(newValue) as string[];
          const otherSegmentIds = selectedSegmentIds.filter(
            (id) => !segment.attributes.some((attr) => attr.id === id)
          );
          const allSelectedIds = [...otherSegmentIds, ...selectedValues];

          if (allSelectedIds.length > 0) {
            handlers.setValue(allSelectedIds.join(ARRAY_SEPARATOR));
          } else {
            handlers.clear();
          }
        };

        return (
          <ReactSelect
            className={cn('min-w-48')}
            key={segment.id}
            size={size}
            {...(showLabel && { label: segment.name })}
            isClearable
            isLoading={isPending}
            isMulti
            onChange={handleChange}
            onClear={handleClear}
            options={groupOptions}
            placeholder={segment.name}
            value={handleMultiSelect(options, segmentSelectedIds)}
            variant="outline"
          />
        );
      })}
    </div>
  );
}
