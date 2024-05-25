import Filter from '../api/filter';

const addLocationFilter = (filters: Filter[], location: string | null) => [
  ...filters,
  { type: 'location', value: location },
];

export default addLocationFilter;
