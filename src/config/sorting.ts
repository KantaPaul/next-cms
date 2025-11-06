import { generateEnumObject } from "@/db/db-utils";
import { type ValueOf } from "type-fest";
/**
 * Sort Order
 */
export const SortOrderEntries = ["asc", "desc"] as const;
export const SortOrder = generateEnumObject(SortOrderEntries);
export type SortOrderType = ValueOf<typeof SortOrder>;
