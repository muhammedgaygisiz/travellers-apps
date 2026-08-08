import { computed, Resource, Signal } from '@angular/core';

/**
 * A resource's value, or nothing while it is loading or has failed.
 *
 * `ResourceRef.value()` *throws* a `ResourceValueError` once its resource is in
 * an error state, and `defaultValue` does not cover that: the value computed
 * throws before it is ever consulted. Read straight from a template, that
 * throw aborts the whole binding update for the element — every input declared
 * after it silently never runs — so the surface freezes in whatever state it
 * was in, usually a loading skeleton, with nothing on screen to explain it.
 * That is what left the Bite details page loading forever in GitHub issue
 * #1232.
 *
 * Anything that reads a resource whose loader can reject reads it through here
 * instead, and reports the failure separately with {@link resourceFailed}.
 */
export function resourceValue<T>(resource: Resource<T>): Signal<T | undefined>;
export function resourceValue<T>(
  resource: Resource<T | undefined>,
  fallback: T,
): Signal<T>;
export function resourceValue<T>(
  resource: Resource<T | undefined>,
  fallback?: T,
): Signal<T | undefined> {
  return computed(() => (resource.hasValue() ? resource.value() : fallback));
}

/**
 * True once a resource's read has failed. Unlike the value, this is safe to
 * read at any time, and it is what gives a surface a terminal state instead of
 * a loading state that never ends.
 */
export const resourceFailed = <T>(resource: Resource<T>): Signal<boolean> =>
  computed(() => resource.status() === 'error');
