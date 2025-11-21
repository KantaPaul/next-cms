export type Option = {
  label: string;
  value: string;
  icon?: React.ReactNode;
  isLink?: boolean;
  [key: string]: unknown;
};
