import { Observable, firstValueFrom, of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { BiteTribeApiService } from 'bite-tribe/api';
import type { Action } from '@ngrx/store';
import type { Bite, Like } from 'model';
import { LikeEffects } from '../effects';
import { loadedLikesFromApi } from '../actions';
import { BiteActions } from '../../bites/actions';

const BiteTribeApiServiceMock = {
  loadLikesForBites: jest.fn(),
  saveLike: jest.fn(),
  removeLike: jest.fn(),
};

const like = (biteId: string): Like =>
  ({ biteId, userId: 'user1', likeType: 'thumbup' }) as Like;

const biteWith = (id: string, likes: Like[]): Bite => ({ id, likes }) as Bite;

describe(LikeEffects.name, () => {
  let actions$: Observable<Action>;
  let effects: LikeEffects;

  beforeEach(() => {
    actions$ = of({ type: 'INIT' });
    TestBed.configureTestingModule({
      providers: [
        LikeEffects,
        provideMockActions(() => actions$),
        provideMockStore({}),
        { provide: BiteTribeApiService, useValue: BiteTribeApiServiceMock },
      ],
    });
    effects = TestBed.inject(LikeEffects);
    jest.clearAllMocks();
  });

  /**
   * The position feed carries the caller's likes, so re-fetching them would
   * spend reads on data that already arrived, and would leave the feed showing
   * liked Bites as unliked until it came back. See GitHub issue #1357.
   */
  describe('seedLikesFromPositionFeed$', () => {
    it('takes the likes that arrived with the feed', async () => {
      const bites = [
        biteWith('bite1', [like('bite1')]),
        biteWith('bite2', []),
        biteWith('bite3', [like('bite3')]),
      ];
      actions$ = of(BiteActions.loadedByGPSPositionFromAPI({ bites }));

      const result = await firstValueFrom(effects.seedLikesFromPositionFeed$);

      expect(result).toEqual(
        loadedLikesFromApi({ likes: [like('bite1'), like('bite3')] }),
      );
    });

    it('does not read the likes again', async () => {
      actions$ = of(
        BiteActions.loadedByGPSPositionFromAPI({
          bites: [biteWith('bite1', [like('bite1')])],
        }),
      );

      await firstValueFrom(effects.seedLikesFromPositionFeed$);

      expect(BiteTribeApiServiceMock.loadLikesForBites).not.toHaveBeenCalled();
    });

    it('copes with a feed whose bites carry no likes field', async () => {
      actions$ = of(
        BiteActions.loadedByGPSPositionFromAPI({
          bites: [{ id: 'bite1' } as Bite],
        }),
      );

      const result = await firstValueFrom(effects.seedLikesFromPositionFeed$);

      expect(result).toEqual(loadedLikesFromApi({ likes: [] }));
    });
  });

  describe('startListener$', () => {
    it('does not fire for the position feed', async () => {
      actions$ = of(
        BiteActions.loadedByGPSPositionFromAPI({
          bites: [biteWith('bite1', [like('bite1')])],
        }),
      );

      let fired = false;
      effects.startListener$.subscribe(() => (fired = true));
      await Promise.resolve();

      expect(fired).toBe(false);
      expect(BiteTribeApiServiceMock.loadLikesForBites).not.toHaveBeenCalled();
    });
  });
});
