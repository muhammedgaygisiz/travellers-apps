import Filter from '../api/filter';
import { MostSearchedItem } from '../api/most-searched-item.model';

const getFilteredPrices = (
  mostSearchedEntries: MostSearchedItem[] | null,
  filters: Filter[]
): MostSearchedItem[] | undefined =>
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
