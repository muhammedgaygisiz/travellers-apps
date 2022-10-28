import { MostSearchedItem } from '@travellers-apps/utils-common';
import Filter from '../model/filter';

const getFilteredPrices = (
  mostSearchedEntries: MostSearchedItem[] | null,
  filters: Filter[]
) =>
  mostSearchedEntries?.filter((price) =>
    filters
      .map((filter) => {
        if (filter.type === 'location') {
          return price.location === filter.value;
        }

        return false;
      })
      .reduce((acc, curr) => acc || curr, false)
  );

export default getFilteredPrices;
