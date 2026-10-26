import { z } from 'zod';
import { apiSchemas } from '@/server/api/v1';

type JsonSchema = Record<string, unknown>;

function zodToJsonSchema(schema: z.ZodType): JsonSchema {
  const node = schema as unknown as {
    type?: string;
    def?: {
      shape?: Record<string, z.ZodType>;
      element?: z.ZodType;
      innerType?: z.ZodType;
      entries?: Record<string, string>;
      valueType?: z.ZodType;
    };
  };
  const type = node.type;
  const def = node.def ?? {};

  if (type === 'object') {
    const shape = def.shape ?? {};
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    for (const [key, child] of Object.entries(shape)) {
      const childType = (child as { type?: string }).type;
      const optional = childType === 'optional' || childType === 'default';
      const inner = optional
        ? ((child as { def?: { innerType?: z.ZodType } }).def?.innerType ?? child)
        : child;
      properties[key] = zodToJsonSchema(inner);
      if (!optional) required.push(key);
    }
    return {
      type: 'object',
      properties,
      ...(required.length ? { required } : {}),
    };
  }

  if (type === 'array') {
    const element = def.element ?? z.unknown();
    return { type: 'array', items: zodToJsonSchema(element) };
  }

  if (type === 'string') return { type: 'string' };
  if (type === 'number') return { type: 'number' };
  if (type === 'boolean') return { type: 'boolean' };
  if (type === 'enum') {
    return { type: 'string', enum: Object.values(def.entries ?? {}) };
  }
  if (type === 'nullable') {
    const inner = zodToJsonSchema(def.innerType ?? z.unknown());
    return { anyOf: [inner, { type: 'null' }] };
  }
  if (type === 'optional' || type === 'default') {
    return zodToJsonSchema(def.innerType ?? z.unknown());
  }
  if (type === 'record') {
    return {
      type: 'object',
      additionalProperties: zodToJsonSchema(def.valueType ?? z.unknown()),
    };
  }
  return {};
}

const bearer = [{ bearerAuth: [] }];

function ok(schemaName: string) {
  return {
    '200': {
      description: 'OK',
      content: {
        'application/json': {
          schema: { $ref: `#/components/schemas/${schemaName}` },
        },
      },
    },
  };
}

export function buildOpenApiSpec() {
  const schemas = Object.fromEntries(
    Object.entries(apiSchemas).map(([name, schema]) => [name, zodToJsonSchema(schema)])
  );

  return {
    openapi: '3.1.0',
    info: {
      title: 'Next CMS',
      version: '1.0.0',
      description: 'Read API for published content. Send an API key as a bearer token.',
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer' },
      },
      schemas,
    },
    paths: {
      '/api/v1/pages': {
        get: {
          security: bearer,
          parameters: [
            { name: 'lang', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: ok('PagesList'),
        },
      },
      '/api/v1/pages/{slug}': {
        get: {
          security: bearer,
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'lang', in: 'query', schema: { type: 'string' } },
          ],
          responses: ok('Page'),
        },
      },
      '/api/v1/posts': {
        get: {
          security: bearer,
          parameters: [
            { name: 'lang', in: 'query', schema: { type: 'string' } },
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'tag', in: 'query', schema: { type: 'string' } },
            { name: 'sort', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: ok('PostsList'),
        },
      },
      '/api/v1/posts/{slug}': {
        get: {
          security: bearer,
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'lang', in: 'query', schema: { type: 'string' } },
          ],
          responses: ok('Post'),
        },
      },
      '/api/v1/menus': {
        get: {
          security: bearer,
          parameters: [{ name: 'location', in: 'query', schema: { type: 'string' } }],
          responses: ok('Menus'),
        },
      },
      '/api/v1/media': {
        get: {
          security: bearer,
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { name: 'folder', in: 'query', schema: { type: 'string' } },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['image', 'video', 'document'] } },
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
          ],
          responses: ok('MediaList'),
        },
      },
      '/api/v1/settings': {
        get: { security: bearer, responses: ok('Settings') },
      },
      '/api/v1/search': {
        get: {
          security: bearer,
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'lang', in: 'query', schema: { type: 'string' } },
          ],
          responses: ok('Search'),
        },
      },
    },
  };
}
