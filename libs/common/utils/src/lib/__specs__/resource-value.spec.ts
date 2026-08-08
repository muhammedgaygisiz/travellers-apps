import { resource, ResourceRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { resourceFailed, resourceValue } from '../resource-value';

const settle = async (): Promise<void> => {
  TestBed.flushEffects();

  for (let tick = 0; tick < 20; tick++) {
    await Promise.resolve();
  }

  TestBed.flushEffects();
};

describe('resourceValue', () => {
  let failing: ResourceRef<string[] | undefined>;
  let loaded: ResourceRef<string[] | undefined>;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    TestBed.runInInjectionContext(() => {
      failing = resource({
        loader: () => Promise.reject(new Error('permission-denied')),
      });
      loaded = resource({ loader: () => Promise.resolve(['a']) });
    });
  });

  it('should hand over the value once it is there', async () => {
    const value = TestBed.runInInjectionContext(() => resourceValue(loaded));

    await settle();

    expect(value()).toEqual(['a']);
  });

  // Reading `value()` on a failed resource throws a ResourceValueError, which
  // takes down the whole binding update it sits in. See #1232.
  it('should answer a failed read with nothing instead of throwing', async () => {
    const value = TestBed.runInInjectionContext(() => resourceValue(failing));

    await settle();

    expect(() => failing.value()).toThrow();
    expect(value()).toBeUndefined();
  });

  it('should answer a failed read with the fallback when one is given', async () => {
    const value = TestBed.runInInjectionContext(() =>
      resourceValue(failing, [] as string[]),
    );

    await settle();

    expect(value()).toEqual([]);
  });

  it('should answer with nothing while the read is still running', () => {
    const value = TestBed.runInInjectionContext(() => resourceValue(loaded));

    expect(value()).toBeUndefined();
  });
});

describe('resourceFailed', () => {
  it('should report a failed read', async () => {
    TestBed.configureTestingModule({});

    const { failed, succeeded } = TestBed.runInInjectionContext(() => {
      const failing = resource({
        loader: () => Promise.reject(new Error('permission-denied')),
      });
      const loaded = resource({ loader: () => Promise.resolve('ok') });

      return {
        failed: resourceFailed(failing),
        succeeded: resourceFailed(loaded),
      };
    });

    await settle();

    expect(failed()).toBe(true);
    expect(succeeded()).toBe(false);
  });
});
