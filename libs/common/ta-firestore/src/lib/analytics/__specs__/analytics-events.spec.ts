import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ANALYTICS_EVENT_SURFACE,
  AnalyticsEvent,
  AnalyticsEventName,
} from '../analytics-events';

/**
 * The taxonomy's own invariants (GitHub issue #1098).
 *
 * Two things stopped being checkable by the compiler when the taxonomy grew a
 * second app. `ANALYTICS_EVENT_SURFACE` is a total `Record`, so a missing event
 * is a type error - but a *duplicate* event name, or a surface nobody meant,
 * is not. And `TableOperationStatus` is a copy of `TABLE_STATUSES` from
 * `bite-tribe/model`, which this library may not import: the workspace's
 * dependency constraints let `scope:common` depend on `scope:common` alone, and
 * `model` is `scope:bite-tribe`.
 *
 * So the copy is read as text and compared, the way
 * `table-state-parity.spec.ts` compares the backend's copy of the same list.
 * A duplication nothing checks is a duplication that drifts, and this one would
 * drift silently: the union would keep compiling while a status the staff view
 * transitions to could no longer be named in an event parameter.
 */

const LIBRARY_TABLE_STATE = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  '..',
  'bite-tribe-common',
  'model',
  'src',
  'lib',
  'table-state.ts',
);

const ANALYTICS_EVENTS = join(__dirname, '..', 'analytics-events.ts');

const WORKSPACE = join(__dirname, '..', '..', '..', '..', '..', '..', '..');

const FUNNEL_CONFIG = join(
  WORKSPACE,
  'tools',
  'analytics',
  'funnel.config.mjs',
);

const FUNNEL_QUERY = join(
  WORKSPACE,
  'tools',
  'analytics',
  'queries',
  'order-to-bite-funnel.sql',
);

const BITE_SOURCE = join(
  WORKSPACE,
  'libs',
  'bite-tribe',
  'bite',
  'page',
  'src',
  'lib',
  'integration',
  'bite-provenance.ts',
);

/** The events the funnel config declares, in order. */
const funnelEvents = (): string[] =>
  [
    ...readFileSync(FUNNEL_CONFIG, 'utf8').matchAll(/^\s+event: '([^']+)',$/gm),
  ].map((match) => match[1]);

/** The `BiteSource` members, in declaration order. */
const biteSources = (): string[] => {
  const source = readFileSync(BITE_SOURCE, 'utf8');
  const union = /export type BiteSource =([^;]*);/.exec(source);

  if (!union) {
    throw new Error('No BiteSource declaration found');
  }

  return [...union[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
};

/** The `source` values the taxonomy will accept on `bite_created`. */
const taxonomySources = (): string[] => {
  const source = readFileSync(ANALYTICS_EVENTS, 'utf8');
  const entry = /\[AnalyticsEvent\.BiteCreated\]: \{ source:([^}]*)\};/.exec(
    source,
  );

  if (!entry) {
    throw new Error('No BiteCreated parameter declaration found');
  }

  return [...entry[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
};

/**
 * The `TABLE_STATUSES` members, in declaration order.
 *
 * Anchored on the constant rather than on any quoted string in the file, so a
 * status named in a comment is not mistaken for a member.
 */
const modelStatuses = (): string[] => {
  const source = readFileSync(LIBRARY_TABLE_STATE, 'utf8');
  const list = /TABLE_STATUSES = \[([\s\S]*?)\] as const/.exec(source);

  if (!list) {
    throw new Error(
      `No TABLE_STATUSES declaration found in ${LIBRARY_TABLE_STATE}`,
    );
  }

  return [...list[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
};

/** The `TableOperationStatus` members, in declaration order. */
const taxonomyStatuses = (): string[] => {
  const source = readFileSync(ANALYTICS_EVENTS, 'utf8');
  const union = /export type TableOperationStatus =([\s\S]*?);/.exec(source);

  if (!union) {
    throw new Error('No TableOperationStatus declaration found');
  }

  return [...union[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
};

describe('analytics taxonomy', () => {
  const names = Object.values(AnalyticsEvent) as AnalyticsEventName[];

  it('names every event exactly once', () => {
    expect(new Set(names).size).toBe(names.length);
  });

  /**
   * Order as well as membership: `TableStatus` is derived from the array in the
   * model, and a parameter value has to be able to carry any status the staff
   * view can transition a table into.
   */
  it('mirrors the model table statuses in order', () => {
    expect(taxonomyStatuses()).toEqual(modelStatuses());
  });

  it('carries the seven statuses that exist', () => {
    expect(taxonomyStatuses()).toEqual([
      'available',
      'reserved',
      'occupied',
      'ordering',
      'awaitingPayment',
      'cleaning',
      'disabled',
    ]);
  });

  it('assigns every event to a surface the apps know', () => {
    for (const name of names) {
      expect(['consumer', 'business']).toContain(ANALYTICS_EVENT_SURFACE[name]);
    }
  });

  /**
   * The business app owns the table operations and nothing else. An event
   * silently moved to that surface would stop being collected from the
   * consumer app without failing anything.
   */
  it('gives the business app the table operations alone', () => {
    const business = names.filter(
      (name) => ANALYTICS_EVENT_SURFACE[name] === 'business',
    );

    expect(business).toEqual([
      'table_seated',
      'table_freed',
      'table_reserved',
      'table_cleaning_started',
      'table_disabled',
      'table_visit_opened',
      'table_visit_closed',
    ]);
  });
  /**
   * The funnel of issue #1114, which spans this taxonomy, a config under
   * `tools/analytics` and a SQL file - none of which the compiler can see at
   * once.
   *
   * A step naming an event nobody emits is a row of zeroes that reads as a
   * conversion problem, and a query that quietly stops counting a step is the
   * same number arrived at differently. Both are the kind of wrong that is
   * only discovered by somebody making a decision on it.
   */
  describe('the order-to-Bite funnel', () => {
    it('names only events the taxonomy has', () => {
      for (const event of funnelEvents()) {
        expect(names).toContain(event);
      }
    });

    it('declares the seven steps in the order they happen', () => {
      expect(funnelEvents()).toEqual([
        'table_code_scanned',
        'table_session_started',
        'table_order_submitted',
        'table_visit_closed',
        'table_bite_prompt_shown',
        'table_bite_started',
        'bite_created',
      ]);
    });

    it('counts every declared step in the query that measures it', () => {
      const sql = readFileSync(FUNNEL_QUERY, 'utf8');

      for (const event of funnelEvents()) {
        expect(sql).toContain(`'${event}'`);
      }
    });

    /**
     * `bite_created` is the one step the funnel reads through a parameter, so
     * the union the app writes and the union the taxonomy accepts have to be
     * the same one. They are two copies for the usual reason: `scope:common`
     * may not import `scope:bite-tribe`.
     */
    it('agrees with the app about where a Bite came from', () => {
      expect(taxonomySources()).toEqual(biteSources());
    });

    it('carries a value the funnel can filter a meal by', () => {
      expect(biteSources()).toContain('visit');
    });
  });
});
