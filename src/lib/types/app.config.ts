interface AppConfig {
  mode: 'live' | 'maintenance' | 'construction' | 'coming_soon';
  tableItemsPerPage: number;
  tablePageSizeOptions: number[];
}
const appConfig: AppConfig = {
  mode: 'live',
  tableItemsPerPage: 10,
  tablePageSizeOptions: [10, 20, 30, 40, 50],
};
export default appConfig;
