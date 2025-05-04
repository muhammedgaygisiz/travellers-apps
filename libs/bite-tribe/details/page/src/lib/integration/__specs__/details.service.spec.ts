import { TestBed } from '@angular/core/testing';
import { DetailsService } from '../details.service';
import { DetailsDataAccessService } from 'bite-tribe/details-data-access';
import { signal } from '@angular/core';

describe('DetailsService', () => {
  let service: DetailsService;
  let mockDataAccessService: jest.Mocked<DetailsDataAccessService>;

  beforeEach(() => {
    mockDataAccessService = {
      bite: signal('mockBiteData'),
      saveNewTags: jest.fn(),
    } as any;

    TestBed.configureTestingModule({
      providers: [
        DetailsService,
        {
          provide: DetailsDataAccessService,
          useValue: mockDataAccessService,
        },
      ],
    });

    service = TestBed.inject(DetailsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have bite data from DetailsDataAccessService', () => {
    expect(service.bite()).toBe('mockBiteData');
  });

  it('should call dataAccess.saveNewTags with provided tags', () => {
    // Arrange
    const tags = 'italian, spicy';

    // Act
    service.saveNewTags(tags);

    // Assert
    expect(mockDataAccessService.saveNewTags).toHaveBeenCalledWith(tags);
    expect(mockDataAccessService.saveNewTags).toHaveBeenCalledTimes(1);
  });
});
