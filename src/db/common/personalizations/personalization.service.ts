import 'server-only';


import { eq } from 'drizzle-orm';
import db from '@/db';
import { personalizations, personalizedSections } from '@/db/schema';
import type { MutationSchemaInput } from '@/db/helpers/parse-search-params';
import { ApplicationException } from '@/lib/utils/error';
import type { CreatePersonalizationInput, CreatePersonalizedSectionInput, UpdatePersonalizedSectionInput } from '@/db/validation';

export const personalizationService = {
  get: async () => await db.query.personalizations.findMany(),
  create: async (input: CreatePersonalizationInput) =>
    await db.insert(personalizations).values(input).returning(),
  getByPathname: async (pathname: string) =>
    await db.query.personalizations.findFirst({
      where: (t, { eq }) => eq(t.pathname, pathname),
      with: {
        sections: {
          orderBy: (t, { desc }) => desc(t.createdAt),
        },
      },
    }),
  createSection: async (
    input: MutationSchemaInput<CreatePersonalizedSectionInput>
  ) => {
    const { pathname, ...personalizedInput } = input;
    const existing = await personalizationService.getByPathname(pathname);

    if (!existing) {
      return await db.transaction(async tx => {
        const [item] = await personalizationService.create({
          pathname,
          userId: input.userId,
          query: {},
        });

        if (!item) {
          throw new ApplicationException('Failed to create personalization');
        }

        await tx
          .insert(personalizedSections)
          .values({ personalizationId: item.id, ...personalizedInput });
      });
    }

    return await db
      .insert(personalizedSections)
      .values({ personalizationId: existing.id, ...personalizedInput });
  },
  updateSection: async ({
    id,
    ...input
  }: MutationSchemaInput<UpdatePersonalizedSectionInput>) => {
    // console.log('input : ', input);
    const [response] = await db
      .update(personalizedSections)
      .set(input)
      .where(eq(personalizedSections.id, id))
      .returning();
    return response;
  },
};
