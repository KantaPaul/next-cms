'use server';

/**
 * Server actions for persisted style classes (KRK-01). Permissions are
 * checked in the service. The `siteId` argument comes from the browser, so
 * every action first checks it is the signed-in admin's site.
 *
 * A 'use server' file may only export async functions; the grouped
 * `styleClassesActions` object lives in `style-classes.client.ts`.
 */

import type { StyleClassCreateRequest, StyleClassPatch } from '@/schemas/style-classes.schema';
import { adminSiteId } from '@/server/services/site-context';
import {
  create,
  cssForSite,
  duplicate,
  get,
  list,
  remove,
  rename,
  type StyleClass,
  type StyleClassUsage,
  update,
  usage,
  styleClassesEnabled,
  usageCounts,
} from '@/server/services/style-classes.service';

/** Rejects a site id that is not the current admin site. */
async function ownSite(siteId: string): Promise<string> {
  const current = await adminSiteId();
  if (siteId !== current) throw new Error('Style classes belong to a different site.');
  return current;
}

export async function styleClassesList(siteId: string): Promise<StyleClass[]> {
  return list(await ownSite(siteId));
}

export async function styleClassesGet(siteId: string, id: string): Promise<StyleClass | null> {
  return (await get(await ownSite(siteId), id)) ?? null;
}

export async function styleClassesCreate(siteId: string, input: StyleClassCreateRequest): Promise<StyleClass> {
  return create(await ownSite(siteId), input);
}

export async function styleClassesUpdate(siteId: string, id: string, patch: StyleClassPatch): Promise<StyleClass> {
  return update(await ownSite(siteId), id, patch);
}

export async function styleClassesRename(siteId: string, id: string, name: string): Promise<StyleClass> {
  return rename(await ownSite(siteId), id, name);
}

export async function styleClassesDuplicate(siteId: string, id: string, name: string): Promise<StyleClass> {
  return duplicate(await ownSite(siteId), id, name);
}

export async function styleClassesRemove(siteId: string, id: string, force?: boolean): Promise<void> {
  return remove(await ownSite(siteId), id, { force });
}

export async function styleClassesUsage(siteId: string, id: string): Promise<StyleClassUsage[]> {
  return usage(await ownSite(siteId), id);
}

export async function styleClassesUsageCounts(siteId: string): Promise<Record<string, number>> {
  return usageCounts(await ownSite(siteId));
}

/** Whether style classes are on for this site (the editor hides its class tools when off). */
export async function styleClassesIsEnabled(siteId: string): Promise<boolean> {
  return styleClassesEnabled(await ownSite(siteId));
}

/** Every class compiled, for the editor canvas. */
export async function styleClassesCss(siteId: string): Promise<string> {
  const site = await ownSite(siteId);
  await list(site); // permission check: editors only
  return cssForSite(site);
}
