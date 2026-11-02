'use server';

import type { ListingQueryResult } from '@nextcms/builder-core';
import {
  type ListingQueryOptions,
  listingQueryService,
} from '@/server/services/listing-query.service';
import {
  type PaginatedSearchResponse,
  type SearchQueryInput,
  searchIndex,
} from '@/server/services/search.service';

export async function resolveListingQuery(
  rawConfig: unknown,
  options?: ListingQueryOptions
): Promise<ListingQueryResult> {
  return listingQueryService.resolve(rawConfig, options);
}

export async function resolvePaginatedSearch(
  input: SearchQueryInput
): Promise<PaginatedSearchResponse> {
  return searchIndex.searchPaginated(input);
}
