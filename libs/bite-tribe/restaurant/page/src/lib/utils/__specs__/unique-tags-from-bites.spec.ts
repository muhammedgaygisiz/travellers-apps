import { uniqueTagsFromBites } from '../unique-tags-from-bites';

describe('uniqueTagsFromBites', () => {
  it('should return an empty array when given an empty array', () => {
    expect(uniqueTagsFromBites([])).toEqual([]);
  });

  it('should collect the tags of all bites', () => {
    const bites = [{ tags: ['burger', 'spicy'] }, { tags: ['vegan'] }];
    expect(uniqueTagsFromBites(bites)).toEqual(['burger', 'spicy', 'vegan']);
  });

  it('should skip bites without tags', () => {
    const bites = [{ tags: ['sushi'] }, { tags: undefined }, {}];
    expect(uniqueTagsFromBites(bites)).toEqual(['sushi']);
  });

  it('should return each tag only once', () => {
    const bites = [{ tags: ['burger', 'spicy'] }, { tags: ['burger'] }];
    expect(uniqueTagsFromBites(bites)).toEqual(['burger', 'spicy']);
  });

  describe('given the same tag with and without a leading hash', () => {
    it('should return it once without the hash', () => {
      const bites = [{ tags: ['Chinawok'] }, { tags: ['#Chinawok'] }];
      expect(uniqueTagsFromBites(bites)).toEqual(['Chinawok']);
    });

    it('should drop the hash even when only the hashed spelling exists', () => {
      const bites = [{ tags: ['#asianfood'] }];
      expect(uniqueTagsFromBites(bites)).toEqual(['asianfood']);
    });

    it('should drop repeated hashes', () => {
      const bites = [{ tags: ['##cologne'] }];
      expect(uniqueTagsFromBites(bites)).toEqual(['cologne']);
    });

    it('should keep a hash that is not leading', () => {
      const bites = [{ tags: ['rock#roll'] }];
      expect(uniqueTagsFromBites(bites)).toEqual(['rock#roll']);
    });

    it('should drop a tag that is nothing but hashes', () => {
      const bites = [{ tags: ['#'] }, { tags: ['pizza'] }];
      expect(uniqueTagsFromBites(bites)).toEqual(['pizza']);
    });
  });

  describe('given the same tag in different cases', () => {
    it('should return the first spelling only', () => {
      const bites = [{ tags: ['cologne'] }, { tags: ['#Cologne'] }];
      expect(uniqueTagsFromBites(bites)).toEqual(['cologne']);
    });

    it('should keep the first spelling when the hashed one comes first', () => {
      const bites = [{ tags: ['#Cologne'] }, { tags: ['cologne'] }];
      expect(uniqueTagsFromBites(bites)).toEqual(['Cologne']);
    });
  });

  describe("given the reporter's China Wok tags", () => {
    it('should return three tags instead of six', () => {
      const bites = [
        { tags: ['Chinawok', 'cologne', 'asianfood'] },
        { tags: ['#Chinawok', '#Cologne', '#asianfood'] },
      ];
      expect(uniqueTagsFromBites(bites)).toEqual([
        'Chinawok',
        'cologne',
        'asianfood',
      ]);
    });
  });

  it('should trim surrounding whitespace', () => {
    const bites = [{ tags: ['  spicy  '] }, { tags: ['# spicy'] }];
    expect(uniqueTagsFromBites(bites)).toEqual(['spicy']);
  });
});
