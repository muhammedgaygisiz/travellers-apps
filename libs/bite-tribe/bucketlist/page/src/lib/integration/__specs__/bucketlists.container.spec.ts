/* eslint-disable @typescript-eslint/no-empty-function */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BucketlistsContainerComponent } from '../bucketlists.container';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { addNecessaryIcons } from 'utils';
import { BucketlistsService } from '../bucketlists.service';

jest.mock('heic2any', () => jest.fn());

jest.mock('localization');
addNecessaryIcons();

describe('BucketlistsContainerComponent', () => {
  let component: BucketlistsContainerComponent;
  let fixture: ComponentFixture<BucketlistsContainerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: BucketlistsService,
          useValue: {
            bucketlists: signal(undefined),
            sorting: signal(undefined),
            gotoBucketlistDetails: (): void => {},
            createAndSaveToBucketList: (): void => {},
            sortingChange: (): void => {},
          },
        },
      ],
    });

    fixture = TestBed.createComponent(BucketlistsContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
