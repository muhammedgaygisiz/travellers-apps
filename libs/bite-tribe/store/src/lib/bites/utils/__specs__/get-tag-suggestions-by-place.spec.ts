import { getTagSuggestionsByPlace } from '../get-tag-suggestions-by-place';
import { Bite } from 'model';

describe('getTagSuggestionsByPlace', () => {
  const mockBites: Bite[] = [
    {
      id: '1',
      place: 'Pizza Hut',
      restaurantId: 'rest1',
      tags: ['pizza', 'italian', 'fastfood'],
    } as Bite,
    {
      id: '2',
      place: 'Pizza Hut',
      restaurantId: 'rest1',
      tags: ['pasta', 'pizza', 'italian'],
    } as Bite,
    {
      id: '3',
      place: 'Burger King',
      restaurantId: 'rest2',
      tags: ['burger', 'fastfood', 'american'],
    } as Bite,
    {
      id: '4',
      place: 'Sushi Place',
      restaurantId: 'rest3',
      tags: ['sushi', 'japanese', 'seafood'],
    } as Bite,
    {
      id: '5',
      place: 'Pizza Hut Central',
      restaurantId: 'rest1',
      tags: ['#pizza', '#dessert'],
    } as Bite,
  ];

  it('should return empty array when place name is empty', () => {
    const result = getTagSuggestionsByPlace('', mockBites);
    expect(result).toEqual([]);
  });

  it('should return empty array when place name is only whitespace', () => {
    const result = getTagSuggestionsByPlace('   ', mockBites);
    expect(result).toEqual([]);
  });

  it('should return empty array when no bites exist', () => {
    const result = getTagSuggestionsByPlace('Pizza Hut', []);
    expect(result).toEqual([]);
  });

  it('should return empty array when no matching restaurant found', () => {
    const result = getTagSuggestionsByPlace('Non-existent Place', mockBites);
    expect(result).toEqual([]);
  });

  it('should return unique tags from exact restaurant name match', () => {
    const result = getTagSuggestionsByPlace('Pizza Hut', mockBites);
    // Should include tags from Pizza Hut bites (id 1 and 2)
    // Note: "Pizza Hut Central" is a different restaurant (fuzzy match but not exact)
    expect(result).toContain('pizza');
    expect(result).toContain('italian');
    expect(result).toContain('pasta');
    expect(result).toContain('fastfood');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return tags from fuzzy-matched restaurant names', () => {
    const result = getTagSuggestionsByPlace('pizza ht', mockBites);
    // Should match "Pizza Hut" via fuzzy matching
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('pizza');
    expect(result).toContain('italian');
  });

  it('should remove # symbols from tags', () => {
    const result = getTagSuggestionsByPlace('Pizza Hut Central', mockBites);
    // Tags should not have # symbols
    expect(result).toContain('pizza');
    expect(result).toContain('dessert');
    expect(result).not.toContain('#pizza');
    expect(result).not.toContain('#dessert');
  });

  it('should deduplicate tags (case-insensitive)', () => {
    const bitesWithDuplicates: Bite[] = [
      {
        id: '1',
        place: 'Test Place',
        tags: ['Pizza', 'italian', 'PIZZA'],
      } as Bite,
    ];
    const result = getTagSuggestionsByPlace('Test Place', bitesWithDuplicates);
    // Should only have one 'Pizza' tag
    const pizzaCount = result.filter(
      (tag) => tag.toLowerCase() === 'pizza',
    ).length;
    expect(pizzaCount).toBe(1);
  });

  it('should return tags sorted alphabetically (case-insensitive)', () => {
    const result = getTagSuggestionsByPlace('Pizza Hut', mockBites);
    // Check if sorted
    const sortedResult = [...result].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
    expect(result).toEqual(sortedResult);
  });

  it('should handle bites with no tags', () => {
    const bitesWithNoTags: Bite[] = [
      {
        id: '1',
        place: 'Test Place',
      } as Bite,
      {
        id: '2',
        place: 'Test Place',
        tags: [],
      } as Bite,
    ];
    const result = getTagSuggestionsByPlace('Test Place', bitesWithNoTags);
    expect(result).toEqual([]);
  });

  it('should handle bites with empty string tags', () => {
    const bitesWithEmptyTags: Bite[] = [
      {
        id: '1',
        place: 'Test Place',
        tags: ['', '  ', 'valid'],
      } as Bite,
    ];
    const result = getTagSuggestionsByPlace('Test Place', bitesWithEmptyTags);
    expect(result).toEqual(['valid']);
  });

  it('should deduplicate similar tags using fuzzy matching', () => {
    const bitesWithSimilarTags: Bite[] = [
      {
        id: '1',
        place: 'Test Place',
        tags: ['italian', 'italiana', 'italianfood'],
      } as Bite,
    ];
    const result = getTagSuggestionsByPlace('Test Place', bitesWithSimilarTags);
    // Should keep the longest variant when tags are similar
    expect(result.length).toBeLessThan(3);
    expect(result).toContain('italianfood');
  });

  it('should match restaurant by ID when provided', () => {
    const result = getTagSuggestionsByPlace('rest2', mockBites);
    expect(result).toContain('burger');
    expect(result).toContain('fastfood');
    expect(result).toContain('american');
  });

  it('should not include duplicate tags from multiple bites', () => {
    const result = getTagSuggestionsByPlace('Pizza Hut', mockBites);
    // 'pizza' appears in multiple bites but should only appear once
    const uniqueTags = new Set(result);
    expect(result.length).toBe(uniqueTags.size);
  });

  it('should handle case-insensitive place name matching', () => {
    const result = getTagSuggestionsByPlace('PIZZA HUT', mockBites);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('pizza');
  });
});
