import Filter from '../api/filter';

const addLocationFilter = (
  filters: Filter[],
  location: string | null
): Filter[] => [...filters, { type: 'location', value: location }];

export default addLocationFilter;
