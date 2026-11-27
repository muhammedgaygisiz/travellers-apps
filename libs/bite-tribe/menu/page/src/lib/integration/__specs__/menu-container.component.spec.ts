jest.mock('@capacitor-firebase/analytics', () => ({
  FirebaseAnalytics: { setCurrentScreen: jest.fn() },
}));
jest.mock('../menu.service', () => ({ MenuService: class {} }));

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Restaurant } from 'model';
import { MenuContainer } from '../menu-container.component';
import { MenuService } from '../menu.service';

/**
 * The dish ratings are read once the restaurant is known, not on init
 * (GitHub issue #2309): a menu opened by link or reload initialises before
 * its restaurant has loaded.
 */
describe(MenuContainer.name, () => {
  let restaurant: ReturnType<typeof signal<Restaurant | undefined>>;
  let loadStats: jest.Mock;
  let loadOwnDietaryVotes: jest.Mock;

  const create = (): ComponentFixture<MenuContainer> => {
    const fixture = TestBed.createComponent(MenuContainer);
    fixture.detectChanges();

    return fixture;
  };

  beforeEach(() => {
    restaurant = signal<Restaurant | undefined>(undefined);
    loadStats = jest.fn().mockResolvedValue(undefined);
    loadOwnDietaryVotes = jest.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: MenuService,
          useValue: { restaurant, loadStats, loadOwnDietaryVotes },
        },
      ],
    });
    TestBed.overrideComponent(MenuContainer, {
      set: { template: '', imports: [] },
    });
  });

  it('reads the ratings when the restaurant arrives after the menu opened', () => {
    const fixture = create();

    expect(loadStats).not.toHaveBeenCalled();

    restaurant.set({ id: 'r-1' } as Restaurant);
    fixture.detectChanges();

    expect(loadStats).toHaveBeenCalledTimes(1);
    // The member's own dietary votes are read with them (issue #2197).
    expect(loadOwnDietaryVotes).toHaveBeenCalledTimes(1);
  });

  it('reads them straight away when the restaurant is already loaded', () => {
    restaurant.set({ id: 'r-1' } as Restaurant);

    create();

    expect(loadStats).toHaveBeenCalledTimes(1);
  });

  it('reads them again for another restaurant, not for the same one', () => {
    restaurant.set({ id: 'r-1' } as Restaurant);
    const fixture = create();

    restaurant.set({ id: 'r-1', name: 'Renamed' } as Restaurant);
    fixture.detectChanges();
    expect(loadStats).toHaveBeenCalledTimes(1);

    restaurant.set({ id: 'r-2' } as Restaurant);
    fixture.detectChanges();
    expect(loadStats).toHaveBeenCalledTimes(2);
  });
});
