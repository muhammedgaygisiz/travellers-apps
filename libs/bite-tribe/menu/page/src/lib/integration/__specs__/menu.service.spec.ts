jest.mock('bite-tribe/menu-data-access', () => ({
  MenuDataAccessService: jest.fn(),
}));
jest.mock('bite-tribe/dietary-vote', () => ({
  DietaryVotePromptService: jest.fn(),
}));

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular';
import { MenuDataAccessService } from 'bite-tribe/menu-data-access';
import { DietaryVotePromptService } from 'bite-tribe/dietary-vote';
import { BehaviorSubject } from 'rxjs';
import type { Bite, Menu, MenuItem, Restaurant } from 'model';
import { MenuService } from '../menu.service';

const RESTAURANT = {
  id: 'r-1',
  name: 'Trattoria Roma',
  position: { latitude: 46.9, longitude: 7.4 },
} as Restaurant;

const ITEM = { id: 'item-1', name: 'Rösti', price: 18 } as MenuItem;

/** See GitHub issue #2129. */
describe(MenuService.name, () => {
  let service: MenuService;
  let menu: ReturnType<typeof signal<Menu | undefined>>;
  let prepared: jest.Mock;
  let navigateForward: jest.Mock;
  let back: jest.Mock;
  let restaurant: ReturnType<typeof signal<Restaurant | undefined>>;
  let dataAccess: Record<string, unknown>;
  let tallies: BehaviorSubject<Record<string, unknown>>;
  let prompt: { run: jest.Mock };

  beforeEach(() => {
    menu = signal<Menu | undefined>(undefined);
    prepared = jest.fn();
    navigateForward = jest.fn();
    back = jest.fn();
    restaurant = signal<Restaurant | undefined>(RESTAURANT);
    dataAccess = {
      bite: signal(undefined),
      restaurant,
      menu,
      isMenuLoading: signal(false),
      isMenuUnavailable: signal(false),
      prepareBiteFromMenuItem: prepared,
      loadMenuItemStats: jest
        .fn()
        .mockResolvedValue({ 'item-1': { count: 2 } }),
      loadBitesForMenuItem: jest.fn().mockResolvedValue([{ id: 'b-1' }]),
      saveMenu: jest.fn().mockResolvedValue(undefined),
      retryMenuLoad: jest.fn(),
      isAuthenticated: signal(true),
      dietaryLabelTallies$: jest.fn(() => tallies),
      loadOwnDietaryVotes: jest
        .fn()
        .mockResolvedValue({ 'item-1': { vegan: 'confirm' } }),
      voteDietaryLabel: jest.fn().mockResolvedValue({ status: 'saved' }),
    };
    tallies = new BehaviorSubject<Record<string, unknown>>({
      'item-1': { vegan: { confirm: 2, dispute: 0 } },
    });
    prompt = {
      run: jest.fn(async (_label, _own, send) =>
        send({ vote: 'dispute', reason: 'animal-product' }),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        MenuService,
        { provide: MenuDataAccessService, useValue: dataAccess },
        { provide: NavController, useValue: { navigateForward, back } },
        { provide: DietaryVotePromptService, useValue: prompt },
      ],
    });
    service = TestBed.inject(MenuService);
  });

  const preparedBite = (): Partial<Bite> => prepared.mock.calls[0][0];

  it("carries the menu's currency", () => {
    menu.set({ currency: 'CHF', categories: [] } as unknown as Menu);

    service.prepareBiteFromMenuItem(ITEM);

    expect(preparedBite().currency).toBe('CHF');
  });

  it('carries no currency from a menu that states none, rather than euros', () => {
    menu.set({ categories: [] } as unknown as Menu);

    service.prepareBiteFromMenuItem(ITEM);

    expect(preparedBite()).not.toHaveProperty('currency');
  });

  it('carries the dish, the restaurant and the menu item link, then opens the form', () => {
    menu.set({ currency: 'CHF', categories: [] } as unknown as Menu);

    service.prepareBiteFromMenuItem(ITEM);

    expect(preparedBite()).toEqual(
      expect.objectContaining({
        name: 'Rösti',
        price: 18,
        place: 'Trattoria Roma',
        restaurantId: 'r-1',
        menuItemId: 'item-1',
        position: RESTAURANT.position,
      }),
    );
    expect(navigateForward).toHaveBeenCalledWith(['new-bite']);
  });

  describe('the dish Bites around it', () => {
    it('loads the stats for the restaurant, and nothing without one', async () => {
      await service.loadStats();
      expect(service.stats()).toEqual({ 'item-1': { count: 2 } });

      restaurant.set(undefined);
      (dataAccess['loadMenuItemStats'] as jest.Mock).mockClear();
      await service.loadStats();
      expect(dataAccess['loadMenuItemStats']).not.toHaveBeenCalled();
    });

    it('opens and closes the Bites of a dish', async () => {
      await service.openBitesFor(ITEM);

      expect(service.selectedDish()).toBe(ITEM);
      expect(service.bitesForDish()).toEqual([{ id: 'b-1' }]);
      expect(service.isLoadingBites()).toBe(false);

      service.closeBites();
      expect(service.selectedDish()).toBeUndefined();
      expect(service.bitesForDish()).toEqual([]);
    });

    it('ends the loading state when the read fails', async () => {
      (dataAccess['loadBitesForMenuItem'] as jest.Mock).mockRejectedValue(
        new Error('offline'),
      );

      await expect(service.openBitesFor(ITEM)).rejects.toThrow('offline');
      expect(service.isLoadingBites()).toBe(false);
    });

    it('does not open a dish without an id', async () => {
      await service.openBitesFor({ name: 'x' } as MenuItem);

      expect(service.selectedDish()).toBeUndefined();
    });
  });

  describe('navigation', () => {
    it('leaves after a save lands', async () => {
      await service.saveMenu({ categories: [] } as unknown as Menu);
      expect(back).toHaveBeenCalled();
    });

    it('retries the menu read and goes back on request', () => {
      service.retryMenuLoad();
      service.goBack();

      expect(dataAccess['retryMenuLoad']).toHaveBeenCalled();
      expect(back).toHaveBeenCalled();
    });
  });

  it('prepares a Bite without a restaurant, at no position', () => {
    restaurant.set(undefined);

    service.prepareBiteFromMenuItem({ name: 'x', price: 1 } as MenuItem);

    expect(preparedBite()).toEqual(
      expect.objectContaining({
        place: '',
        position: { latitude: 0, longitude: 0 },
      }),
    );
    expect(preparedBite()).not.toHaveProperty('menuItemId');
  });

  /** Diners' votes on the dishes' dietary labels (GitHub issue #2197). */
  describe('dietary votes', () => {
    it("carries the restaurant's counts, the own votes and the offer to vote", async () => {
      await service.loadOwnDietaryVotes();
      TestBed.tick();

      expect(dataAccess['dietaryLabelTallies$']).toHaveBeenCalledWith('r-1');
      expect(service.dietaryVotes()).toEqual({
        tallies: { 'item-1': { vegan: { confirm: 2, dispute: 0 } } },
        own: { 'item-1': { vegan: 'confirm' } },
        canVote: true,
      });
    });

    it('sends a vote on the dish and reads the own votes again', async () => {
      await service.loadOwnDietaryVotes();

      await service.voteDietaryLabel({ item: ITEM, label: 'vegan' });

      expect(prompt.run).toHaveBeenCalledWith(
        'vegan',
        'confirm',
        expect.any(Function),
      );
      expect(dataAccess['voteDietaryLabel']).toHaveBeenCalledWith({
        target: { type: 'menuItem', restaurantId: 'r-1', menuItemId: 'item-1' },
        label: 'vegan',
        vote: 'dispute',
        reason: 'animal-product',
      });
      expect(dataAccess['loadOwnDietaryVotes']).toHaveBeenCalledTimes(2);
    });

    it('does not read the votes again when the vote did not count', async () => {
      prompt.run.mockResolvedValue({
        status: 'ineligible',
        reason: 'own-bite',
      });

      await service.voteDietaryLabel({ item: ITEM, label: 'vegan' });

      expect(dataAccess['loadOwnDietaryVotes']).not.toHaveBeenCalled();
    });

    it('offers nothing without a restaurant or a dish id', async () => {
      await service.voteDietaryLabel({
        item: { name: 'No id' } as MenuItem,
        label: 'vegan',
      });
      restaurant.set(undefined);
      await service.voteDietaryLabel({ item: ITEM, label: 'vegan' });
      await service.loadOwnDietaryVotes();

      expect(prompt.run).not.toHaveBeenCalled();
      expect(dataAccess['loadOwnDietaryVotes']).not.toHaveBeenCalled();
      expect(service.dietaryVotes().own).toEqual({});
    });
  });
});
