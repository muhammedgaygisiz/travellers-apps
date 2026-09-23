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

const COHORTS_CONFIG = join(
  WORKSPACE,
  'tools',
  'analytics',
  'cohorts.config.mjs',
);

const ACTIVATION_QUERY = join(
  WORKSPACE,
  'tools',
  'analytics',
  'queries',
  'activation-funnel.sql',
);

const RETENTION_QUERY = join(
  WORKSPACE,
  'tools',
  'analytics',
  'queries',
  'retention-cohorts.sql',
);

const PROVISION_GA4 = join(
  WORKSPACE,
  'tools',
  'analytics',
  'provision-ga4.mjs',
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

/**
 * The activation steps the cohort config declares, in order.
 *
 * `origin` comes back with each one because two of the steps are GA4's own
 * automatic events rather than ours, and only the taxonomy-owned ones can be
 * checked against the taxonomy.
 */
const activationSteps = (): {
  events: string[];
  origin: string;
  conversion: boolean;
}[] => {
  const source = readFileSync(COHORTS_CONFIG, 'utf8');
  const block = /export const ACTIVATION_STEPS = \[([\s\S]*?)\n\];/.exec(
    source,
  );

  if (!block) {
    throw new Error('No ACTIVATION_STEPS declaration found');
  }

  return [...block[1].matchAll(/\{\s*\n([\s\S]*?)\n {2}\}/g)].map((step) => ({
    events: [
      ...(/events: \[([^\]]*)\]/.exec(step[1])?.[1] ?? '').matchAll(
        /'([^']+)'/g,
      ),
    ].map((match) => match[1]),
    origin: /origin: '([^']+)'/.exec(step[1])?.[1] ?? '',
    conversion: /conversion: true/.test(step[1]),
  }));
};

/** The GA4 key events `provision-ga4.mjs` registers (issue #910). */
const keyEvents = (): string[] => {
  const source = readFileSync(PROVISION_GA4, 'utf8');
  const block = /const KEY_EVENTS = \[([\s\S]*?)\];/.exec(source);

  if (!block) {
    throw new Error('No KEY_EVENTS declaration found');
  }

  return [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
};

/** The retention horizons the cohort config declares. */
const retentionHorizons = (): number[] => {
  const source = readFileSync(COHORTS_CONFIG, 'utf8');
  const block = /export const RETENTION_HORIZONS = \[([^\]]*)\]/.exec(source);

  if (!block) {
    throw new Error('No RETENTION_HORIZONS declaration found');
  }

  return [...block[1].matchAll(/\d+/g)].map((match) => Number(match[0]));
};

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

  /**
   * The activation funnel and retention cohorts of issue #987, which span the
   * same three places the order-to-Bite funnel does - this taxonomy, a config
   * under `tools/analytics`, and SQL nothing type-checks.
   *
   * The failure they guard against is specific: a renamed event leaves a step
   * counting nothing, and a step counting nothing is a 0% conversion rate that
   * reads as a product disaster rather than as a broken query. The retention
   * half has the same shape - a horizon the config promises and the SQL does
   * not compute comes back as `n/a` forever.
   */
  describe('the activation funnel', () => {
    it('names only events the taxonomy has, or GA4 automatic events', () => {
      for (const step of activationSteps()) {
        if (step.origin === 'ga4') {
          // `first_open` and `first_visit` are GA4's, fired before any of our
          // code runs. The taxonomy is right not to declare them.
          expect(step.events.every((event) => !names.includes(event))).toBe(
            true,
          );
          continue;
        }

        for (const event of step.events) expect(names).toContain(event);
      }
    });

    it('declares the five steps in the order they happen', () => {
      expect(activationSteps().map((step) => step.events)).toEqual([
        ['first_open', 'first_visit'],
        ['onboarding_assistant_started'],
        ['onboarding_assistant_completed'],
        ['sign_up'],
        ['bite_created'],
      ]);
    });

    it('counts every declared step in the query that measures it', () => {
      const sql = readFileSync(ACTIVATION_QUERY, 'utf8');

      for (const step of activationSteps()) {
        for (const event of step.events) expect(sql).toContain(`'${event}'`);
      }
    });

    /**
     * The acceptance criterion of issue #987, as a test: a conversion step has
     * to be one of the GA4 key events issue #910 registered, or the funnel and
     * the GA4 console are measuring conversion differently.
     */
    it('converts on the GA4 key events the property is provisioned with', () => {
      const conversions = activationSteps().filter((step) => step.conversion);

      expect(conversions.length).toBeGreaterThan(0);
      for (const step of conversions) {
        for (const event of step.events) {
          expect(keyEvents()).toContain(event);
        }
      }
    });
  });

  describe('the retention cohorts', () => {
    it('computes every horizon it declares', () => {
      const sql = readFileSync(RETENTION_QUERY, 'utf8');

      for (const horizon of retentionHorizons()) {
        expect(sql).toContain(`d${horizon}_pct`);
        expect(sql).toContain(`INTERVAL ${horizon} DAY`);
      }
    });

    /**
     * The guard that makes the numbers safe to read: a horizon a cohort has
     * not reached yet is `NULL`, never 0. Asserted on the SQL because there is
     * no other place it can be asserted - and because deleting it would leave
     * every young cohort reporting a total collapse in retention.
     */
    it('reports an unmatured horizon as null rather than zero', () => {
      const sql = readFileSync(RETENTION_QUERY, 'utf8');

      for (const horizon of retentionHorizons()) {
        expect(sql).toContain(
          `DATE_ADD(cohort_day, INTERVAL ${horizon} DAY) <= (SELECT last_day FROM window_bounds)`,
        );
        // Asserted on the fallback rather than only on the condition: a guard
        // that falls back to 0 still has the condition, and is exactly the bug.
        expect(sql).toMatch(
          new RegExp(`COUNTIF\\(d${horizon}\\),\\s*\\n\\s*NULL`),
        );
        expect(sql).toMatch(
          new RegExp(
            `ROUND\\(100 \\* SAFE_DIVIDE\\(COUNTIF\\(d${horizon}\\), COUNT\\(\\*\\)\\), 1\\),\\s*\\n\\s*NULL`,
          ),
        );
      }
      expect(sql).toContain('MAX(event_day) AS last_day');
    });

    it('builds a cohort from arrival rather than from first sight', () => {
      const sql = readFileSync(RETENTION_QUERY, 'utf8');

      expect(sql).toContain(
        "WHERE event_name IN ('first_open', 'first_visit')",
      );
    });
  });
});
