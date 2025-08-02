import { handleTagFilters } from '../handle-tag-filters';
import { Bite } from 'model';

describe('handleTagFilters', () => {
  it('should return all bites when no filters are applied', () => {
    const bites = [
      { id: 1, tags: ['#food', '#drink'] },
      { id: 2, tags: ['#travel'] },
    ] as unknown as Bite[];
    const filters: string[] = [];
    const result = handleTagFilters(filters, bites);
    expect(result).toEqual(bites);
  });

  it('should filter bites by tags', () => {
    const bites = [
      { id: 1, tags: ['#food', '#drink'] },
      { id: 2, tags: ['#travel'] },
      { id: 3, tags: ['#food'] },
    ] as unknown as Bite[];
    const filters = ['food'];
    const result = handleTagFilters(filters, bites);
    expect(result).toEqual([
      { id: 1, tags: ['#food', '#drink'] },
      { id: 3, tags: ['#food'] },
    ]);
  });

  it('should handle multiple tag filters', () => {
    const bites = [
      { id: 1, tags: ['#food', '#drink'] },
      { id: 2, tags: ['#travel'] },
      { id: 3, tags: ['#food'] },
      { id: 4, tags: ['#drink'] },
    ] as unknown as Bite[];
    const filters = ['food', 'drink'];
    const result = handleTagFilters(filters, bites);
    expect(result).toEqual([{ id: 1, tags: ['#food', '#drink'] }]);
  });

  it('should return an empty array if no bites match the filters', () => {
    const bites = [
      { id: 1, tags: ['#food', '#drink'] },
      { id: 2, tags: ['#travel'] },
    ] as unknown as Bite[];
    const filters = ['adventure'];
    const result = handleTagFilters(filters, bites);
    expect(result).toEqual([]);
  });

  it('should ignore bites without tags or with non-array tags', () => {
    const bites = [
      { id: 1, tags: ['#food', '#drink'] },
      { id: 2 }, // No tags
      { id: 3, tags: 'not an array' }, // Invalid tags
    ] as unknown as Bite[];

    const filters = ['food'];
    const result = handleTagFilters(filters, bites);
    expect(result).toEqual([{ id: 1, tags: ['#food', '#drink'] }]);
  });

  it('should clean tags by removing # symbols for comparison', () => {
    const bites = [
      { id: 1, tags: ['#food', '#drink'] },
      { id: 2, tags: ['#travel'] },
    ] as unknown as Bite[];
    const filters = ['food'];
    const result = handleTagFilters(filters, bites);
    expect(result).toEqual([{ id: 1, tags: ['#food', '#drink'] }]);
  });

  it('should handle empty bites array', () => {
    const bites: Bite[] = [];
    const filters = ['food'];
    const result = handleTagFilters(filters, bites);
    expect(result).toEqual([]);
  });

  it('should handle bites with undefined tags', () => {
    const bites = [
      { id: 1, tags: ['#food', '#drink'] },
      { id: 2, tags: undefined }, // Undefined tags
    ] as unknown as Bite[];
    const filters = ['food'];
    const result = handleTagFilters(filters, bites);
    expect(result).toEqual([{ id: 1, tags: ['#food', '#drink'] }]);
  });

  it('should handle bites with empty tags array', () => {
    const bites = [
      { id: 1, tags: ['#food', '#drink'] },
      { id: 2, tags: [] }, // Empty tags array
    ] as unknown as Bite[];
    const filters = ['food'];
    const result = handleTagFilters(filters, bites);
    expect(result).toEqual([{ id: 1, tags: ['#food', '#drink'] }]);
  });
});
