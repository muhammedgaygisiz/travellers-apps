import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { ToastService } from 'toast';
import { documentOwnerGuard } from '../document-owner.guard';
import { AuthService } from '../auth.service';

jest.mock('@capacitor-firebase/firestore');

const OPTIONS = {
  collection: 'restaurants',
  paramName: 'restaurantId',
  ownerField: 'ownerUserId',
  refusalMessageKey: 'restaurant-not-assigned-to-account',
  redirectTo: '/restaurants',
};

describe('documentOwnerGuard', () => {
  let getUser: jest.Mock;
  let whenAuthStateRestored: jest.Mock;
  let parseUrl: jest.Mock;
  let present: jest.Mock;

  const routeWith = (params: Record<string, string>): ActivatedRouteSnapshot =>
    ({
      paramMap: { get: (name: string) => params[name] ?? null },
    }) as unknown as ActivatedRouteSnapshot;

  const runGuard = (
    params: Record<string, string> = { restaurantId: 'restaurant-1' },
  ): Promise<boolean | UrlTree> =>
    TestBed.runInInjectionContext(
      () =>
        documentOwnerGuard(OPTIONS)(routeWith(params), {
          url: '/restaurant/restaurant-1',
        } as RouterStateSnapshot) as Promise<boolean | UrlTree>,
    );

  const documentOwnedBy = (ownerUserId?: string): void => {
    jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
      snapshot: { id: 'restaurant-1', data: { ownerUserId } },
    } as unknown as Awaited<ReturnType<typeof FirebaseFirestore.getDocument>>);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    getUser = jest.fn(() => ({ uid: 'user-1' }));
    whenAuthStateRestored = jest.fn(() => Promise.resolve());
    parseUrl = jest.fn(
      (url: string): UrlTree => ({ url }) as unknown as UrlTree,
    );
    present = jest.fn(async () => undefined);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { getUser, whenAuthStateRestored },
        },
        { provide: Router, useValue: { parseUrl } },
        { provide: ToastService, useValue: { present } },
      ],
    });
  });

  it('admits the account named on the document', async () => {
    documentOwnedBy('user-1');

    await expect(runGuard()).resolves.toBe(true);

    expect(FirebaseFirestore.getDocument).toHaveBeenCalledWith({
      reference: 'restaurants/restaurant-1',
    });
    expect(present).not.toHaveBeenCalled();
  });

  /**
   * The deny case is the whole point: the list no longer offers this
   * restaurant, so anyone arriving here typed, bookmarked or was sent the URL.
   */
  it('refuses an account the document is assigned away from', async () => {
    documentOwnedBy('another-account');

    await expect(runGuard()).resolves.toEqual({ url: '/restaurants' });

    expect(present).toHaveBeenCalledWith({
      messageKey: OPTIONS.refusalMessageKey,
      outcome: 'failure',
    });
  });

  it('refuses an unowned document rather than treating it as free', async () => {
    documentOwnedBy(undefined);

    await expect(runGuard()).resolves.toEqual({ url: '/restaurants' });
    expect(present).toHaveBeenCalled();
  });

  /**
   * Membership mode (epic #1614): a document held by a set of accounts admits
   * every member, and the single-owner field keeps working beside it.
   */
  describe('with an owner set field', () => {
    const runSetGuard = (): Promise<boolean | UrlTree> =>
      TestBed.runInInjectionContext(
        () =>
          documentOwnerGuard({ ...OPTIONS, ownerSetField: 'ownerUserIds' })(
            routeWith({ restaurantId: 'restaurant-1' }),
            { url: '/restaurant/restaurant-1' } as RouterStateSnapshot,
          ) as Promise<boolean | UrlTree>,
      );

    const documentWith = (data: Record<string, unknown>): void => {
      jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
        snapshot: { id: 'restaurant-1', data },
      } as unknown as Awaited<
        ReturnType<typeof FirebaseFirestore.getDocument>
      >);
    };

    it('admits a member of the set', async () => {
      documentWith({ ownerUserIds: ['another-account', 'user-1'] });

      await expect(runSetGuard()).resolves.toBe(true);
    });

    it('still admits the account named in the single field', async () => {
      documentWith({ ownerUserId: 'user-1' });

      await expect(runSetGuard()).resolves.toBe(true);
    });

    it('refuses an account in neither field', async () => {
      documentWith({
        ownerUserId: 'another-account',
        ownerUserIds: ['a-third-account'],
      });

      await expect(runSetGuard()).resolves.toEqual({ url: '/restaurants' });
      expect(present).toHaveBeenCalled();
    });

    it('refuses when the set is not a list', async () => {
      documentWith({ ownerUserIds: 'user-1' });

      await expect(runSetGuard()).resolves.toEqual({ url: '/restaurants' });
    });
  });

  /**
   * Set-only mode, the shape the business app uses once the single-owner
   * field is gone (issue #1754): a value in a field the guard was not told
   * about grants nothing.
   */
  it('admits only by the set when no single field is named', async () => {
    jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
      snapshot: {
        id: 'restaurant-1',
        data: { ownerUserId: 'user-1', ownerUserIds: ['another-account'] },
      },
    } as unknown as Awaited<ReturnType<typeof FirebaseFirestore.getDocument>>);

    await expect(
      TestBed.runInInjectionContext(
        () =>
          documentOwnerGuard({
            collection: OPTIONS.collection,
            paramName: OPTIONS.paramName,
            ownerSetField: 'ownerUserIds',
            refusalMessageKey: OPTIONS.refusalMessageKey,
            redirectTo: OPTIONS.redirectTo,
          })(routeWith({ restaurantId: 'restaurant-1' }), {
            url: '/restaurant/restaurant-1',
          } as RouterStateSnapshot) as Promise<boolean | UrlTree>,
      ),
    ).resolves.toEqual({ url: '/restaurants' });
  });

  it('ignores a set field it was not told about', async () => {
    jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
      snapshot: { id: 'restaurant-1', data: { ownerUserIds: ['user-1'] } },
    } as unknown as Awaited<ReturnType<typeof FirebaseFirestore.getDocument>>);

    await expect(runGuard()).resolves.toEqual({ url: '/restaurants' });
  });

  it('refuses when the document cannot be read', async () => {
    jest
      .spyOn(FirebaseFirestore, 'getDocument')
      .mockRejectedValue(new Error('permission-denied'));

    await expect(runGuard()).resolves.toEqual({ url: '/restaurants' });
    expect(present).toHaveBeenCalled();
  });

  it('refuses when the route carries no document id', async () => {
    await expect(runGuard({})).resolves.toEqual({ url: '/restaurants' });

    expect(FirebaseFirestore.getDocument).not.toHaveBeenCalled();
    expect(present).toHaveBeenCalled();
  });

  /**
   * `authGuard` owns the signed-out answer and sits on the same route, so this
   * guard redirects without a toast rather than the two talking over each
   * other. It must not read the document either: there is no uid to compare.
   */
  it('redirects a signed-out visitor silently', async () => {
    getUser.mockReturnValue(null);

    await expect(runGuard()).resolves.toEqual({ url: '/restaurants' });

    expect(FirebaseFirestore.getDocument).not.toHaveBeenCalled();
    expect(present).not.toHaveBeenCalled();
  });

  /**
   * Angular activates a route's guards concurrently rather than in sequence,
   * so this one cannot lean on `authGuard` having waited for the persisted
   * session (see the Cold Start Rules in `Architecture - Auth`).
   */
  it('waits for auth restoration before judging the visitor', async () => {
    documentOwnedBy('user-1');

    await runGuard();

    expect(whenAuthStateRestored).toHaveBeenCalled();
  });
});
