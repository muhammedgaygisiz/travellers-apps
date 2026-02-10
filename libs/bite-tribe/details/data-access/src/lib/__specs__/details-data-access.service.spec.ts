import { DetailsDataAccessService } from '../details-data-access.service';
import { TestBed } from '@angular/core/testing';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of } from 'rxjs';

jest.mock('bite-tribe/store');

describe(DetailsDataAccessService.name, () => {
  let service: DetailsDataAccessService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DetailsDataAccessService,
        {
          provide: BiteTribeStoreService,
          useValue: {
            reviews$: of(),
            bucketlists$: of(),
            exchangeRates$: of(),
            preferedCurrency$: of(),
            userId$: of(),
            isAuthenticated$: of(),
          },
        },
      ],
    });
  });

  it('should be created', () => {
    service = TestBed.inject(DetailsDataAccessService);
    expect(service).toBeTruthy();
  });
});
