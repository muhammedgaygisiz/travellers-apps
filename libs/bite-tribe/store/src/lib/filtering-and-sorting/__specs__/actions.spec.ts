import { FilteringAndSortingActions } from '../actions';

describe('Filtering and Sorting Actions', () => {
  it('should have a setHomeFilters action', () => {
    expect(FilteringAndSortingActions.setHomeFilters).toBeDefined();
  });

  it('should have a setHomeSorting action', () => {
    expect(FilteringAndSortingActions.setHomeSorting).toBeDefined();
  });

  it('should have a setBucketlistSorting action', () => {
    expect(FilteringAndSortingActions.setBucketlistSorting).toBeDefined();
  });

  it('should have a setMyBitesSorting action', () => {
    expect(FilteringAndSortingActions.setMyBitesSorting).toBeDefined();
  });

  it('should have a clearHomeFilters action', () => {
    expect(FilteringAndSortingActions.clearHomeFilters).toBeDefined();
  });
});
