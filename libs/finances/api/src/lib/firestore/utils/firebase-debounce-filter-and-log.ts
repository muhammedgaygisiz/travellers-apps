import {
  debounceTime,
  filter,
  map,
  Observable,
  pipe,
  tap,
  UnaryFunction,
} from 'rxjs';

export const firebaseDebounceFilterAndLog = <T>(
  id: keyof T,
  typeName?: string
): UnaryFunction<Observable<T[]>, Observable<T[]>> => {
  return pipe(
    debounceTime<T[]>(200),
    filter((results: T[]) => results.some((result) => result[id])),
    map((results) =>
      results
        .filter((res) => res[id])
        .sort((a, b) => `${a[id]}`.localeCompare(`${b[id]}`))
    ),
    tap((results) =>
      typeName
        ? console.log(`${typeName} collection received:`, results)
        : console.log('Collection received:', results)
    )
  );
};
