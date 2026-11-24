import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import { BiteTrailsDataAccessService } from 'bite-tribe-creator/bite-trails-data-access';
import { BiteTrailsService } from '../bite-trails.service';
import { BiteTrailsContainer } from '../bite-trails-container';

jest.mock('bite-tribe-creator/bite-trails-data-access', () => ({
  BiteTrailsDataAccessService: class BiteTrailsDataAccessService {},
}));

describe(BiteTrailsService.name, () => {
  const dataAccess = {
    biteTrails: { reload: jest.fn() },
    biteTrailsValue: signal([]),
    isAuthenticated: signal(true),
    logout: jest.fn(),
  };
  const navController = { navigateForward: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: BiteTrailsDataAccessService, useValue: dataAccess },
        { provide: NavController, useValue: navController },
      ],
    });
  });

  it('opens the create page', () => {
    TestBed.inject(BiteTrailsService).createBiteTrailClicked();

    expect(navController.navigateForward).toHaveBeenCalledWith([
      'create-bite-trail',
    ]);
  });

  it('signs out through the data access', () => {
    TestBed.inject(BiteTrailsService).logout();

    expect(dataAccess.logout).toHaveBeenCalled();
  });

  // The page stays alive under the create page, so a trail just made has to
  // be read again on the way back.
  it('re-reads the trails each time the page is entered', () => {
    const container = TestBed.runInInjectionContext(
      () => new BiteTrailsContainer(),
    );

    container.ionViewWillEnter();

    expect(dataAccess.biteTrails.reload).toHaveBeenCalled();
  });
});
