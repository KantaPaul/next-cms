import "server-only";
import { db } from "@/db";
import type {
  FindOneParams,
  MutationSchemaInput,
} from "@/db/helpers/parse-search-params";
import type { DBTrx } from "@/lib/types";
import { and, eq, isNull } from "drizzle-orm";
import type {
  CreatePagesInput,
  UpdatePagesInput,
} from '@/app/(admin)/dashboard/pages/_modules/pages.validation';
import { pages } from "@/db/schema";

export const pagesServices = {
  /**
   * Retrieves a paginated list of incidents with advanced search and filtering capabilities
   *
   * @param searchParams - Search, filter, pagination, and sorting parameters
   * @returns Paginated incident data with total count
   */
  // getPaginated: async (searchParams: SearchParams) => {
  //   const { page, size, sort, order, search, ...filters } =
  //     parseSearchParams(searchParams);
  //   const { offset, limit } = paginate({ page, size });

  //   // Build comprehensive where clause combining filters and search conditions
  //   const whereClause = andWhere([
  //     ...equalFilters(healthAndSafetyIncidents, filters),
  //     or(
  //       // Search across incident core fields
  //       ...searchFilters(
  //         healthAndSafetyIncidents,
  //         ["title", "description"],
  //         search
  //       )
  //     ),
  //   ]);

  //   // Create alias for self-referencing injured person relationship
  //   const injuredPerson = alias(employees, "injuredPerson");

  //   // Create alias for self-referencing injured person relationship
  //   const reportsTo = alias(employees, "reportsTo");

  //   // Main query with complex joins and aggregations
  //   const data = await db
  //     .select({
  //       ...getTableColumns(healthAndSafetyIncidents),
  //       // Injured person hierarchy relationship
  //       injuredPerson: {
  //         fullName: injuredPerson.fullName,
  //         id: injuredPerson.id,
  //         // Aggregated roles (many-to-many relationship)
  //         roles: jsonAggBuildObject({
  //           name: RolesTable.name,
  //           id: RolesTable.id,
  //         }),
  //       },
  //       // Reports to hierarchy relationship
  //       reportsTo: {
  //         fullName: reportsTo.fullName,
  //         id: reportsTo.id,
  //       },
  //       // Type relationship
  //       type: {
  //         name: healthAndSafetyIncidentTypes.name,
  //         id: healthAndSafetyIncidentTypes.id,
  //       },
  //     })
  //     .from(healthAndSafetyIncidents)
  //     // Join with injured person (self-reference)
  //     .leftJoin(
  //       injuredPerson,
  //       eq(injuredPerson.id, healthAndSafetyIncidents.injuredPerson)
  //     )
  //     // Join with injured person with roles
  //     .leftJoin(
  //       employeeRoles,
  //       eq(employeeRoles.employeeId, healthAndSafetyIncidents.injuredPerson)
  //     )
  //     .leftJoin(RolesTable, eq(RolesTable.id, employeeRoles.roleId))
  //     // Join with reports to (self-reference)
  //     .leftJoin(reportsTo, eq(reportsTo.id, healthAndSafetyIncidents.reportsTo))
  //     // Join with type
  //     .leftJoin(
  //       healthAndSafetyIncidentTypes,
  //       eq(healthAndSafetyIncidentTypes.id, healthAndSafetyIncidents.type)
  //     )
  //     .where(whereClause)
  //     // Group by main entities to handle JSON aggregation correctly
  //     .groupBy(
  //       healthAndSafetyIncidents.id,
  //       injuredPerson.id,
  //       reportsTo.id,
  //       healthAndSafetyIncidentTypes.id
  //     )
  //     .orderBy(withSorting({ sort, order }))
  //     .limit(limit)
  //     .offset(offset);

  //   // Separate count query with same joins and filters for accurate pagination
  //   const [{ totalCount }] = await db
  //     .select({
  //       totalCount: sqlCount(healthAndSafetyIncidents.id),
  //     })
  //     .from(healthAndSafetyIncidents)
  //     .where(whereClause);

  //   return {
  //     totalCount,
  //     data,
  //   };
  // },

  /**
   * Creates a new incident record with comprehensive relationship management.
   * Wrapped in a database transaction to ensure data integrity.
   */
  create: async (
    { ...inputs }: MutationSchemaInput<CreatePagesInput>,
    orm: DBTrx = db
  ) => {
    // Main transaction
    const inserted = await orm.transaction(async (tx) => {
      return await tx
        .insert(pages)
        .values({
          ...inputs,
        })
        .returning();
    });

    return inserted;
  },

  /**
   * Updates an existing incident record with comprehensive relationship management
   *
   * @param input - Updated incident data with relationships
   * @returns Updated incident record
   */
  update: async (
    { ...inputs }: MutationSchemaInput<UpdatePagesInput>,
    orm: DBTrx = db
  ) => {
    const { id, userId, ...input } = inputs;
    // Main transaction
    const updated = await orm.transaction(async (tx) => {
      return await tx
        .update(pages)
        .set({ ...input })
        .where(and(eq(pages.id, id), eq(pages.createdBy, userId)))
        .returning();
    });

    return updated;
  },

  /**
   * Retrieves a single incident by ID with complete relationship data
   *
   * @param params - incident ID, team ID, and user context
   * @returns Complete incident record with all relations
   */
  getById: async (params: FindOneParams) => {
    const { id, userId } = params;

    return await db.query.categories.findFirst({
      where: (table, { eq, and }) =>
        and(
          eq(table.id, id),
          eq(table.createdBy, String(userId)),
          isNull(table.deletedAt)
        ),
    });
  },

  /**
   * Retrieves a single incident by ID with complete relationship data
   *
   * @param params - incident ID, team ID, and user context
   * @returns Complete incident record with all relations
   */
  // getByIdForSingleView: async (params: FindOneParams) => {
  //   const { id, teamId } = params;

  //   const data = await db.query.healthAndSafetyIncidents.findFirst({
  //     where: (table, { eq, and }) =>
  //       and(
  //         eq(table.id, id),
  //         eq(table.teamId, teamId),
  //         isNull(table.deletedAt)
  //       ),
  //     with: {
  //       involvedPersons: {
  //         with: {
  //           person: {
  //             columns: {
  //               id: true,
  //               fullName: true,
  //             },
  //           },
  //         },
  //       },
  //       location: true,
  //       attachments: true,
  //       injuredPerson: {
  //         columns: {
  //           fullName: true,
  //         },
  //       },
  //       reportsTo: {
  //         columns: {
  //           fullName: true,
  //         },
  //       },
  //     },
  //   });

  //   if (!data) {
  //     notFound();
  //   }

  //   const [country, state, city] = await Promise.all([
  //     locationQuery.getCountry(data?.location?.country),
  //     locationQuery.getState(data?.location?.state),
  //     locationQuery.getCity(data?.location?.city),
  //   ]);

  //   return {
  //     ...data,
  //     location: {
  //       ...data?.location,
  //       country: country?.name,
  //       state: state?.name,
  //       city: city?.name,
  //     },
  //   };
  // },

  // delete: async (
  //   params: MutationSchemaInput<UpdateHealthAndSafetyIncidentInput>
  // ) => {
  //   const { id, teamId } = params;

  //   const existing = await healthAndSafetyIncidentServices.getById({
  //     id,
  //     teamId,
  //   });
  //   if (!existing) throw new ApplicationException("Incident not found");

  //   return await db.transaction(async (trx) => {
  //     const [deleted] = await trx
  //       .delete(healthAndSafetyIncidents)
  //       .where(
  //         and(
  //           eq(healthAndSafetyIncidents.id, id),
  //           eq(healthAndSafetyIncidents.teamId, teamId)
  //         )
  //       )
  //       .returning();

  //     await trx
  //       .delete(locations)
  //       .where(
  //         and(
  //           eq(locations.id, deleted.locationId),
  //           eq(locations.teamId, teamId)
  //         )
  //       );

  //     return deleted;
  //   });
  // },

  // upsertIncidentPersons: async (
  //   input: {
  //     incidentId: string;
  //     involvedPersons: CreateHealthAndSafetyIncidentInput["involvedPersons"];
  //     teamId: string;
  //   },
  //   orm: DBTrx = db
  // ) => {
  //   const { incidentId, involvedPersons, teamId } = input;

  //   const insertData = involvedPersons?.map((id) => ({
  //     incidentId,
  //     person: id,
  //     teamId,
  //   }));

  //   if (!isArraySafe(insertData)) return [];

  //   await orm
  //     .delete(incidentsInvolvedPersons)
  //     .where(
  //       and(
  //         eq(incidentsInvolvedPersons.incidentId, incidentId),
  //         eq(incidentsInvolvedPersons.teamId, teamId)
  //       )
  //     );

  //   return orm.insert(incidentsInvolvedPersons).values(insertData);
  // },
};
