import { personalizationService } from '@/db/common/personalizations/personalization.service';

//TODO: cache may apply here
export const personalizationQuery = {
  getByPathname: personalizationService.getByPathname,
};
