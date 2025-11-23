import { useMemo } from 'react';
import { CONFIG_COLUMNS } from '@/config/accounting/finance-config';
import { useDirectServerQuery } from '@/hooks/use-server-query';
import useQueryParams from '@/hooks/useQueryParam';
import { getConfigurationByColumn } from '@/server/actions/finance-configuration.action';
import { DatePickerFilter } from './filters/date-picker-filter';
import { DateRangeFilter } from './filters/date-range-filter';
import { MultiSelectFilter } from './filters/multi-select-filter';
import { NumberRangeFilter } from './filters/number-range-filter';
import { SegmentFilter } from './filters/segment-filter';
import { SelectFilter } from './filters/select-filter';
import { SwitchFilter } from './filters/switch-filter';
import { TextFilter } from './filters/text-filter';
import type { FilterConfig } from './types';
import { useFilterHandlers } from './use-filter-handlers';

export function FilterItem({
  size = 'md',
  name,
  label,
  showLabel,
  type,
  prefix,
  className,
  isDrawer,
  placeholder = '',
  ...config
}: FilterConfig) {
  const { queryParams, isPending, updateParams, removeParams } = useQueryParams();
  const handlers = useFilterHandlers(name, updateParams, removeParams);

  const paramValue = queryParams[name];
  const paramValueStr = useMemo(
    () => (Array.isArray(paramValue) ? paramValue[0] : paramValue) ?? '',
    [paramValue]
  );

  // Only fetch segments data when filter type is 'segment' and segmentOptions is not provided
  const { data } = useDirectServerQuery(
    ['filter-segments', CONFIG_COLUMNS.SEGMENTS],
    () => getConfigurationByColumn(CONFIG_COLUMNS.SEGMENTS),
    { enabled: type === 'segment' && !config.segmentOptions }
  );

  const commonProps = {
    value: paramValueStr,
    size,
    label,
    showLabel,
    className,
    placeholder,
    isPending,
    handlers,
    config,
  };

  switch (type) {
    case 'text':
      return <TextFilter {...commonProps} prefix={prefix} />;

    case 'select':
      return (
        <SelectFilter
          {...commonProps}
          isDisabled={config.disabled}
          options={config.options}
          prefix={prefix}
        />
      );

    case 'multiselect':
      return <MultiSelectFilter {...commonProps} options={config.options} />;

    case 'switch':
      return <SwitchFilter {...commonProps} />;

    case 'datepicker':
      return <DatePickerFilter {...commonProps} isClearable={config.isClearable} />;

    case 'daterange':
      return <DateRangeFilter {...commonProps} />;

    case 'numberRange':
      return <NumberRangeFilter {...commonProps} />;

    case 'segment': {
      const segments = config.segmentOptions || data?.segments;
      if (!segments) {
        return null;
      }

      return <SegmentFilter {...commonProps} isDrawer={isDrawer} segments={segments} />;
    }

    default:
      return null;
  }
}
