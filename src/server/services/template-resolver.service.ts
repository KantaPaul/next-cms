import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db } from '@/db';
import { templateRules } from '@/db/schema';

export type TemplateArea = 'header' | 'footer' | 'search' | 'archive';
export type TemplateRuleKind =
  | 'post-type'
  | 'category'
  | 'tag'
  | 'user-state'
  | 'role'
  | 'archive-type'
  | 'search-kind';

export type TemplateRuleItem = {
  id?: string;
  templateId: string;
  area: TemplateArea;
  kind: TemplateRuleKind;
  value: string;
  priority?: number;
};

export type ResolvableEntity = {
  headerTemplateId?: string | null;
  footerTemplateId?: string | null;
  hideHeader?: boolean;
  hideFooter?: boolean;
  type?: 'page' | 'post';
  categoryIds?: string[];
  tagIds?: string[];
  [key: string]: unknown;
};

export type ResolutionInput = {
  area: 'header' | 'footer';
  entity?: ResolvableEntity | null;
  rules?: TemplateRuleItem[];
  localeOverride?: string | null;
  siteDefault?: string | null;
};

export type ResolutionResult = {
  templateId: string | null;
  source: 'explicit-hide' | 'entity-override' | 'rule' | 'locale' | 'site-default' | 'fallback';
  isHidden: boolean;
  matchedRule?: TemplateRuleItem;
};

const SPECIFICITY_WEIGHT: Record<string, number> = {
  tag: 30,
  category: 20,
  'post-type': 10,
  'archive-type': 8,
  'search-kind': 8,
  'user-state': 5,
  role: 5,
};

/**
 * Pure resolver function implementing template precedence:
 * entity override / explicit hide > display rules (priority & specificity) > locale override > site default > fallback
 */
export function resolveTemplate(input: ResolutionInput): ResolutionResult {
  const { area, entity, rules = [], localeOverride, siteDefault } = input;
  const isHeader = area === 'header';

  const templateOverride = isHeader
    ? entity?.headerTemplateId
    : entity?.footerTemplateId;
  const isExplicitHide =
    templateOverride === 'none' ||
    (isHeader ? entity?.hideHeader === true : entity?.hideFooter === true);

  // 1. Explicit hide: do NOT fall back to rules, locale, or site default
  if (isExplicitHide) {
    return {
      templateId: null,
      source: 'explicit-hide',
      isHidden: true,
    };
  }

  // 2. Explicit entity override
  if (templateOverride && templateOverride !== '') {
    return {
      templateId: templateOverride,
      source: 'entity-override',
      isHidden: false,
    };
  }

  // 3. Rule-based assignment
  const areaRules = rules.filter(r => r.area === area);
  if (areaRules.length > 0 && entity) {
    const sortedRules = [...areaRules].sort((a, b) => {
      const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
      if (priorityDiff !== 0) return priorityDiff;
      const specA = SPECIFICITY_WEIGHT[a.kind] ?? 0;
      const specB = SPECIFICITY_WEIGHT[b.kind] ?? 0;
      return specB - specA;
    });

    for (const rule of sortedRules) {
      let matches = false;
      if (rule.kind === 'post-type' && entity.type === rule.value) {
        matches = true;
      } else if (
        rule.kind === 'category' &&
        Array.isArray(entity.categoryIds) &&
        entity.categoryIds.includes(rule.value)
      ) {
        matches = true;
      } else if (
        rule.kind === 'tag' &&
        Array.isArray(entity.tagIds) &&
        entity.tagIds.includes(rule.value)
      ) {
        matches = true;
      }

      if (matches) {
        return {
          templateId: rule.templateId,
          source: 'rule',
          isHidden: false,
          matchedRule: rule,
        };
      }
    }
  }

  // 4. Locale override
  if (localeOverride && localeOverride.trim() !== '') {
    return {
      templateId: localeOverride,
      source: 'locale',
      isHidden: false,
    };
  }

  // 5. Site default
  if (siteDefault && siteDefault.trim() !== '') {
    return {
      templateId: siteDefault,
      source: 'site-default',
      isHidden: false,
    };
  }

  // 6. Built-in layout fallback
  return {
    templateId: null,
    source: 'fallback',
    isHidden: false,
  };
}

function sortRules(rules: TemplateRuleItem[]): TemplateRuleItem[] {
  return [...rules].sort((a, b) => {
    const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    return (SPECIFICITY_WEIGHT[b.kind] ?? 0) - (SPECIFICITY_WEIGHT[a.kind] ?? 0);
  });
}

/** What an archive route knows about itself, for archive display rules. */
export type ArchiveRuleContext = {
  archiveType: 'category' | 'tag' | 'author' | 'date' | 'term' | 'collection';
  /** Collection slug, or `post` for blog archives. */
  postType?: string;
  /** Category / tag / term id for taxonomy archives. */
  termId?: string;
};

/** What the search page knows, for search display rules. */
export type SearchRuleContext = {
  /** Active results filter (`?kind=`), absent for "all". */
  kind?: string;
};

/**
 * Pure matcher for search and archive display rules. Returns the template of
 * the highest-priority (then most specific) matching rule, or null.
 */
export function resolveRuleTemplate(
  rules: TemplateRuleItem[],
  area: 'search' | 'archive',
  ctx: ArchiveRuleContext | SearchRuleContext
): string | null {
  for (const rule of sortRules(rules.filter(r => r.area === area))) {
    let matches = false;
    if (area === 'archive') {
      const a = ctx as ArchiveRuleContext;
      if (rule.kind === 'archive-type') matches = a.archiveType === rule.value;
      else if (rule.kind === 'post-type') matches = a.postType === rule.value;
      else if (rule.kind === 'category' || rule.kind === 'tag')
        matches = !!a.termId && a.termId === rule.value;
    } else if (rule.kind === 'search-kind') {
      const k = (ctx as SearchRuleContext).kind;
      matches = rule.value === 'all' ? !k : k === rule.value;
    }
    if (matches) return rule.templateId;
  }
  return null;
}

export const templateResolverService = {
  resolveTemplate,
  resolveRuleTemplate,

  /** Load this site's rules for an area and return the matched template id. */
  resolveAreaTemplate: async (
    siteId: string,
    area: 'search' | 'archive',
    ctx: ArchiveRuleContext | SearchRuleContext
  ): Promise<string | null> => {
    try {
      const rules = await templateResolverService.getRulesForSite(siteId, area);
      return resolveRuleTemplate(rules, area, ctx);
    } catch {
      return null;
    }
  },

  getRulesForSite: async (siteId: string, area?: TemplateArea): Promise<TemplateRuleItem[]> => {
    const conditions = [eq(templateRules.siteId, siteId)];
    if (area) {
      conditions.push(eq(templateRules.area, area));
    }

    const rows = await db
      .select({
        id: templateRules.id,
        templateId: templateRules.templateId,
        area: templateRules.area,
        kind: templateRules.kind,
        value: templateRules.value,
        priority: templateRules.priority,
      })
      .from(templateRules)
      .where(and(...conditions))
      .orderBy(desc(templateRules.priority));

    return rows as TemplateRuleItem[];
  },

  getRulesForTemplate: async (
    siteId: string,
    templateId: string
  ): Promise<TemplateRuleItem[]> => {
    const rows = await db
      .select({
        id: templateRules.id,
        templateId: templateRules.templateId,
        area: templateRules.area,
        kind: templateRules.kind,
        value: templateRules.value,
        priority: templateRules.priority,
      })
      .from(templateRules)
      .where(
        and(
          eq(templateRules.siteId, siteId),
          eq(templateRules.templateId, templateId)
        )
      )
      .orderBy(desc(templateRules.priority));

    return rows as TemplateRuleItem[];
  },

  saveRulesForTemplate: async (
    siteId: string,
    templateId: string,
    area: TemplateArea,
    rules: Array<{
      kind: TemplateRuleKind;
      value: string;
      priority?: number;
    }>
  ) => {
    await db
      .delete(templateRules)
      .where(
        and(
          eq(templateRules.siteId, siteId),
          eq(templateRules.templateId, templateId)
        )
      );

    if (rules.length === 0) return [];

    const newRows = rules.map(r => ({
      id: createId(),
      siteId,
      templateId,
      area,
      kind: r.kind,
      value: r.value,
      priority: r.priority ?? 0,
    }));

    return db.insert(templateRules).values(newRows).returning();
  },
};
