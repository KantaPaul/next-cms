/**
 * Dashboard adapter contract tests (B15 E8). One suite runs against every
 * adapter: the package's in-memory adapters, and the CMS adapters
 * (`createDashboardAdapters`) talking to the same bridge code the server
 * actions use (`toBoardLayout`, `toDashboardRecord`, `runDashboardQueries`),
 * with an in-memory board store in place of the database.
 */

import assert from 'node:assert';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  createMemoryDashboardAdapters,
  type DashboardAdapters,
  type DashboardLayout,
  type DashboardQuery,
  type DashboardRecord,
  type DashboardResult,
  dashboardQueryResponseSchema,
  dashboardRecordSchema,
  dashboardSourceSchema,
} from '@nextcms/builder-react';
import type { BoardLayout, WidgetQuery } from '@/db/schemas/analytics.schema';
import {
  pageViewsSource,
  runDashboardQueries,
  toBoardLayout,
  toDashboardLayout,
  toDashboardRecord,
} from '@/lib/analytics/dashboard-bridge';
import {
  createDashboardAdapters,
  type DashboardActions,
} from '@/lib/analytics/dashboard-client-adapters';

const sources = [
  pageViewsSource({
    pages: [{ id: 'p1', title: 'Home' }],
    posts: [{ id: 'q1', title: 'Hello' }],
  }),
];

function answer(dimension: string, measure: string): DashboardResult {
  if (dimension === 'none')
    return { kind: 'stat', value: measure === 'views' ? 42 : 7, previous: 30 };
  if (dimension === 'day')
    return {
      kind: 'series',
      points: [{ label: '2026-10-30', value: 4, previous: null }],
    };
  return {
    kind: 'rows',
    rows: [{ key: '/', label: 'Home', detail: '/', value: 9, previous: null }],
  };
}

const statQuery: DashboardQuery = {
  source: 'pageViews',
  measure: 'views',
  dimension: 'none',
  range: 'inherit',
  compare: true,
  filters: {},
};

const seedLayout: DashboardLayout = {
  range: 30,
  widgets: [
    { id: 'w1', type: 'stat', span: 4, title: 'Views', query: statQuery },
  ],
};

type Fixture = { adapters: DashboardAdapters; executed: () => number };

function memoryFixture(): Fixture {
  let count = 0;
  const adapters = createMemoryDashboardAdapters({
    records: [
      {
        id: 'b1',
        name: 'Overview',
        layout: seedLayout,
        version: 0,
        updatedAt: null,
      },
    ],
    sources,
    run: q => {
      count++;
      return answer(q.dimension, q.measure);
    },
  });
  return { adapters, executed: () => count };
}

/** The server actions' logic over an in-memory board table. */
function cmsFixture(): Fixture {
  const mapped = toBoardLayout(seedLayout);
  assert.ok(mapped.ok);
  const boards = new Map<
    string,
    {
      id: string;
      name: string;
      layout: BoardLayout;
      version: number;
      updatedAt: Date | null;
    }
  >([
    [
      'b1',
      {
        id: 'b1',
        name: 'Overview',
        layout: mapped.layout,
        version: 0,
        updatedAt: null,
      },
    ],
  ]);
  const notFound = {
    hasError: true,
    message: 'Dashboard not found',
    errorType: 'ApplicationException',
  };
  let count = 0;

  const actions: DashboardActions = {
    load: async ({ id }) => {
      const board = boards.get(id);
      return board ? toDashboardRecord(board) : notFound;
    },
    save: async ({ id, name, layout, expectedVersion }) => {
      const board = boards.get(id);
      if (!board) return notFound;
      const stored = toBoardLayout(layout);
      if (!stored.ok)
        return {
          hasError: true,
          message: stored.message,
          errorType: 'ApplicationException',
        };
      if (board.version !== expectedVersion) {
        return { status: 'conflict', current: toDashboardRecord(board) };
      }
      const updatedAt = new Date();
      boards.set(id, {
        ...board,
        name,
        layout: stored.layout,
        version: board.version + 1,
        updatedAt,
      });
      return {
        status: 'saved',
        version: board.version + 1,
        updatedAt: updatedAt.toISOString(),
      };
    },
    listSources: async () => sources,
    query: async ({ requests }) =>
      runDashboardQueries(requests, {
        sources,
        execute: async (q: WidgetQuery) => {
          count++;
          return {
            result: answer(q.dimension, q.metric),
            fetchedAt: new Date().toISOString(),
          };
        },
      }),
  };
  return { adapters: createDashboardAdapters(actions), executed: () => count };
}

for (const [name, make] of [
  ['memory adapters', memoryFixture],
  ['CMS adapters', cmsFixture],
] as const) {
  describe(`dashboard adapter contract: ${name} (B15 E8)`, () => {
    it('loads a record that matches the contract', async () => {
      const { adapters } = make();
      const record = await adapters.storage.load('b1');
      assert.deepEqual(dashboardRecordSchema.parse(record), record);
      assert.equal(record.version, 0);
      assert.deepEqual(record.layout, seedLayout);
    });

    it('rejects an unknown dashboard', async () => {
      const { adapters } = make();
      await assert.rejects(adapters.storage.load('missing'), /not found/);
    });

    it('saves with the current version and bumps it', async () => {
      const { adapters } = make();
      const layout = { ...seedLayout, range: 7 };
      const result = await adapters.storage.save(
        'b1',
        { name: 'Renamed', layout },
        0
      );
      assert.equal(result.status, 'saved');
      assert.equal(result.status === 'saved' && result.version, 1);
      const record = await adapters.storage.load('b1');
      assert.equal(record.name, 'Renamed');
      assert.equal(record.version, 1);
      assert.equal(record.layout.range, 7);
    });

    it('returns a conflict for a stale version and changes nothing', async () => {
      const { adapters } = make();
      await adapters.storage.save(
        'b1',
        { name: 'First', layout: seedLayout },
        0
      );
      const result = await adapters.storage.save(
        'b1',
        { name: 'Second', layout: seedLayout },
        0
      );
      assert.equal(result.status, 'conflict');
      const current = result.status === 'conflict' ? result.current : null;
      assert.equal(current?.name, 'First');
      assert.equal(current?.version, 1);
      assert.equal((await adapters.storage.load('b1')).name, 'First');
    });

    it('lists sources that match the contract', async () => {
      const { adapters } = make();
      const list = await adapters.data.listSources();
      assert.ok(list.length > 0);
      for (const source of list)
        assert.deepEqual(dashboardSourceSchema.parse(source), source);
    });

    it('answers a batch with one response per request, by key', async () => {
      const { adapters } = make();
      const responses = await adapters.data.query([
        { key: 'a', query: statQuery, range: 30 },
        {
          key: 'b',
          query: { ...statQuery, dimension: 'day', compare: false },
          range: 7,
        },
        {
          key: 'c',
          query: { ...statQuery, dimension: 'path', limit: 5 },
          range: 30,
        },
      ]);
      assert.deepEqual(responses.map(r => r.key).sort(), ['a', 'b', 'c']);
      for (const r of responses) {
        dashboardQueryResponseSchema.parse(r);
        assert.equal(r.status, 'ok');
        assert.ok(r.status === 'ok' && !Number.isNaN(Date.parse(r.fetchedAt)));
      }
      const byKey = Object.fromEntries(responses.map(r => [r.key, r]));
      assert.equal(byKey.a?.status === 'ok' && byKey.a.result.kind, 'stat');
      assert.equal(byKey.b?.status === 'ok' && byKey.b.result.kind, 'series');
      assert.equal(byKey.c?.status === 'ok' && byKey.c.result.kind, 'rows');
    });

    it('answers a query outside the source with "invalid", without running it', async () => {
      const { adapters, executed } = make();
      const responses = await adapters.data.query([
        {
          key: 'bad',
          query: { ...statQuery, measure: 'DROP TABLE users' },
          range: 30,
        },
        { key: 'good', query: statQuery, range: 30 },
      ]);
      const bad = responses.find(r => r.key === 'bad');
      assert.equal(bad?.status, 'error');
      assert.equal(bad?.status === 'error' && bad.code, 'invalid');
      assert.equal(responses.find(r => r.key === 'good')?.status, 'ok');
      assert.equal(executed(), 1);
    });

    it('returns nothing for an empty batch', async () => {
      const { adapters } = make();
      assert.deepEqual(await adapters.data.query([]), []);
    });
  });
}

describe('CMS dashboard bridge (B15 E8)', () => {
  it('round-trips a stored board layout', () => {
    const board: BoardLayout = {
      range: 7,
      widgets: [
        {
          id: 'w1',
          type: 'table',
          span: 6,
          query: {
            metric: 'uniqueVisitors',
            dimension: 'referrer',
            compare: false,
            range: 30,
            pageId: 'p1',
            postId: null,
            limit: 10,
          },
        },
      ],
    };
    const layout = toDashboardLayout(board);
    assert.deepEqual(layout.widgets[0]?.query.filters, { pageId: 'p1' });
    const back = toBoardLayout(layout);
    assert.ok(back.ok);
    assert.deepEqual(back.layout, board);
  });

  it('refuses layouts the board table cannot hold, naming the widget', () => {
    const span = toBoardLayout({
      ...seedLayout,
      widgets: [{ ...seedLayout.widgets[0]!, span: 3 }],
    });
    assert.equal(span.ok, false);
    assert.match(!span.ok ? span.message : '', /^Views:/);
    const rule = toBoardLayout({
      ...seedLayout,
      widgets: [{ ...seedLayout.widgets[0]!, type: 'chart' }],
    });
    assert.equal(rule.ok, false);
    assert.match(!rule.ok ? rule.message : '', /non-none dimension/);
    const range = toBoardLayout({ ...seedLayout, range: 14 });
    assert.equal(range.ok, false);
  });

  it('runs identical queries in a batch once', async () => {
    let runs = 0;
    const responses = await runDashboardQueries(
      [
        { key: 'a', query: statQuery, range: 30 },
        { key: 'b', query: { ...statQuery, range: 30 }, range: 7 },
      ],
      {
        sources,
        execute: async () => {
          runs++;
          return {
            result: { kind: 'stat', value: 1, previous: null },
            fetchedAt: new Date().toISOString(),
          };
        },
      }
    );
    assert.equal(runs, 1);
    assert.deepEqual(
      responses.map(r => r.status),
      ['ok', 'ok']
    );
  });

  it('isolates a failing query and hides its error from the client', async () => {
    const logged: unknown[] = [];
    const responses = await runDashboardQueries(
      [
        { key: 'a', query: statQuery, range: 30 },
        {
          key: 'b',
          query: { ...statQuery, measure: 'uniqueVisitors' },
          range: 30,
        },
      ],
      {
        sources,
        execute: async q => {
          if (q.metric === 'views')
            throw new Error('relation "page_views" does not exist');
          return {
            result: { kind: 'stat', value: 2, previous: null },
            fetchedAt: new Date().toISOString(),
          };
        },
        onError: e => logged.push(e),
      }
    );
    const failed = responses.find(r => r.key === 'a');
    assert.equal(failed?.status === 'error' && failed.code, 'failed');
    assert.doesNotMatch(
      failed?.status === 'error' ? failed.message : '',
      /page_views/
    );
    assert.equal(responses.find(r => r.key === 'b')?.status, 'ok');
    assert.equal(logged.length, 1);
  });

  it('refuses ranges the analytics tables do not cover', async () => {
    const [response] = await runDashboardQueries(
      [{ key: 'a', query: statQuery, range: 90 }],
      {
        sources,
        execute: async () => assert.fail('must not run'),
      }
    );
    assert.equal(response?.status === 'error' && response.code, 'invalid');
  });

  it('rejects a batch over the limit before running anything', async () => {
    const requests = Array.from({ length: 51 }, (_, i) => ({
      key: `k${i}`,
      query: statQuery,
      range: 30,
    }));
    await assert.rejects(
      runDashboardQueries(requests, {
        sources,
        execute: async () => assert.fail('must not run'),
      })
    );
  });

  it('turns action errors into thrown errors and checks answers', async () => {
    const adapters = createDashboardAdapters({
      load: async () => ({
        hasError: true,
        message: 'Dashboard not found',
        errorType: 'ApplicationException',
      }),
      save: async () => ({ status: 'saved' }),
      listSources: async () => [{ id: 'x' }],
      query: async () => ({ errors: { requests: ['Too many queries'] } }),
    });
    await assert.rejects(adapters.storage.load('b1'), /Dashboard not found/);
    await assert.rejects(
      adapters.storage.save('b1', { name: 'n', layout: seedLayout }, 0)
    );
    await assert.rejects(adapters.data.listSources());
    await assert.rejects(
      adapters.data.query([{ key: 'a', query: statQuery, range: 30 }]),
      /Too many queries/
    );
  });

  it('maps a stored board to a record with an ISO time', () => {
    const record: DashboardRecord = toDashboardRecord({
      id: 'b1',
      name: 'Overview',
      layout: { range: 30, widgets: [] },
      version: 3,
      updatedAt: new Date('2026-10-31T10:00:00Z'),
    });
    assert.equal(record.updatedAt, '2026-10-31T10:00:00.000Z');
    assert.equal(record.version, 3);
  });
});

describe('no mock adapters in production code (B15 E8)', () => {
  const root = path.resolve(__dirname, '../../..');
  const mockFactories =
    /\b(createMockAdapters|createMemoryDashboardAdapters)\b/;
  const defining = new Set([
    'packages/builder-react/src/adapters.ts',
    'packages/builder-react/src/dashboard-memory.ts',
  ]);

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      if (
        entry === 'node_modules' ||
        entry === '__tests__' ||
        entry === 'gallery'
      )
        continue;
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry))
        out.push(full);
    }
    return out;
  }

  it('only tests and the defining files mention the mock factories', () => {
    const files = [
      ...walk(path.join(root, 'src')),
      ...readdirSync(path.join(root, 'packages')).flatMap(p =>
        walk(path.join(root, 'packages', p, 'src'))
      ),
    ];
    const offenders = files
      .map(f => path.relative(root, f))
      .filter(f => !defining.has(f) && !f.endsWith('/index.ts'))
      .filter(f =>
        mockFactories.test(readFileSync(path.join(root, f), 'utf8'))
      );
    assert.deepEqual(offenders, []);
  });
});
