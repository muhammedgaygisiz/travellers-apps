import { MarketPlaceService } from '../market-place.service';
import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular/standalone';

describe(MarketPlaceService.name, () => {
  let service: MarketPlaceService;
  let navControllerMock: NavController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: NavController, useValue: { navigateForward: jest.fn() } },
      ],
    });

    navControllerMock = TestBed.inject(NavController);
    service = TestBed.inject(MarketPlaceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('onGoToProfileClick', () => {
    it('should navigate to the profile page with the correct ownerId', () => {
      const ownerId = 'owner-123';
      service.onGoToProfileClick(ownerId);
      expect(navControllerMock.navigateForward).toHaveBeenCalledWith([
        'profile',
        ownerId,
      ]);
    });
  });

  describe('onViewBiteTrail', () => {
    it('should navigate to the bite trail page with the correct biteTrail id', () => {
      const biteTrail = { id: 'bite-trail-123' } as any;
      service.onViewBiteTrail(biteTrail);
      expect(navControllerMock.navigateForward).toHaveBeenCalledWith([
        'bite-trail',
        'bite-trail-123',
      ]);
    });
  });
});
