import type { ConfigType, QUnitType } from 'dayjs';

export interface IntervalDatesParams {
  date: ConfigType;
  interval: number;
  unit: QUnitType;
  operationType: 'forward' | 'backward';
}
