export const classNames = {
  container: 'w-full',
  control:
    'border-0 !rounded-lg w-full bg-transparent dark:bg-dark-50 !min-h-11 !shadow-none transition duration-200 4xl:!min-h-12 custom-control',
  controlOutline:
    'border [&]:!border-steel-100 dark:[&]:!border-dark-400 ring-[0.6px] ring-transparent hover:!border-steel-700',
  controlText: '!border-0 !bg-transparent !shadow-none ring-transparent',
  controlTextError: '!bg-red/10',
  controlIsFocused:
    '[&]:!border-steel-700 !ring-steel-700 ring-[0.6px] dark:[&]:!border-dark-500',
  controlIsDisabled: 'dark:!bg-white/10 dark:!border-white/20',
  controlError: '[&]:!border-red !shadow-none !ring-transparent',
  controlIsFocusedError: '!ring-red',
  input:
    'text-steel-700 dark:text-white focus:[&>input]:outline-none focus:[&>input]:shadow-none focus:[&>input]:ring-0 !text-sm',
  indicatorsContainer:
    'hover:!text-steel-200 dark:hover:!text-dark-300 custom-indicator-container',
  dropdownIndicator:
    'text-steel-200 hover:!text-steel-400 dark:text-dark-600 dark:hover:!text-dark-800 !p-1 !mr-2',
  clearIndicator:
    'text-steel-200 hover:!text-steel-400 dark:text-dark-500 dark:hover:!text-steel-300 !p-1',
  indicatorSeparator: '!bg-steel-200 dark:!bg-steel-500',
  indicatorSeparatorIsFocused: '!bg-steel-400',
  valueContainer: '!pl-3',
  multiValue: 'bg-steel-500 dark:bg-steel-600/70 !rounded',
  multiValueLabel: 'text-steel-700 dark:text-steel-200 !pl-2.5 !text-sm',
  singleValue: '!text-steel-700 dark:!text-steel-100 !pl-0 !text-sm',
  multiValueRemove:
    'hover:[&]:!bg-transparent !pl-0 !pr-1.5 !text-steel-400 dark:!text-steel-300 hover:!text-steel-700 dark:hover:!text-steel-100',
  menu: 'bg-white dark:bg-dark-280 !border-steel-100 !shadow-lg dark:shadow-[0_3px_18px_rgba(0,0,0,0.1)] dark:border-dark-400 border dark:border !rounded-md !p-1.5',
  menuList: 'custom-scrollbar',
  menuPortal: '!z-[9999]',
  option:
    '!bg-transparent transition duration-300 !cursor-pointer !rounded !text-sm !text-steel-700 dark:!text-dark-800/75 active:!bg-steel-50 dark:active:!bg-steel-600/40',
  optionIsFocused:
    '!bg-steel-100/40 dark:!bg-dark-400/80 active:!bg-steel-50 dark:active:!bg-dark-300/80 dark:!text-dark-800/85',
  optionIsSelected:
    '!bg-steel-100/70 dark:!bg-dark-400/80 active:!bg-steel-50 dark:active:!bg-dark-300/80 dark:!text-white/80',
  optionIsDisabled: '!text-steel-400 !cursor-not-allowed',
  noOptionsMessage: 'text-sm',
  placeholder: '!text-steel-700/60 dark:!text-steel-100/40 text-sm',
};
