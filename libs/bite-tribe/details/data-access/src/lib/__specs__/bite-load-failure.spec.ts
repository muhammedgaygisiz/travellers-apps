import { Bite } from 'model';
import { classifyBiteLoadFailure } from '../bite-load-failure';
import { BiteNotFoundError } from '../bite-not-found-error';

const bite = { id: 'bite-1' } as Bite;

describe('classifyBiteLoadFailure', () => {
  describe('given the read has not settled', () => {
    it.each(['idle', 'loading', 'reloading'] as const)(
      'should report no failure while %s',
      (status) => {
        expect(
          classifyBiteLoadFailure(status, undefined, undefined),
        ).toBeUndefined();
      },
    );
  });

  describe('given a bite was loaded', () => {
    it('should report no failure', () => {
      expect(
        classifyBiteLoadFailure('resolved', bite, undefined),
      ).toBeUndefined();
    });
  });

  describe('given the bite no longer exists', () => {
    it('should report it as not found', () => {
      expect(
        classifyBiteLoadFailure(
          'error',
          undefined,
          new BiteNotFoundError('gone'),
        ),
      ).toBe('not-found');
    });
  });

  describe('given the read finished with no bite and no error', () => {
    // Resolving successfully to nothing used to be indistinguishable from
    // still loading, which left the page's skeleton running. See #1232.
    it('should report it as not found', () => {
      expect(classifyBiteLoadFailure('resolved', undefined, undefined)).toBe(
        'not-found',
      );
    });
  });

  describe('given the read itself failed', () => {
    // A timeout, a permission rejection or an App Check refusal says nothing
    // about whether the Bite exists, so it must not be answered as deleted.
    it('should report it as unavailable', () => {
      expect(
        classifyBiteLoadFailure('error', undefined, new Error('timed out')),
      ).toBe('unavailable');
    });
  });
});
