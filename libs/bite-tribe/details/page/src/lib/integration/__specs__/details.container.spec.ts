import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailsContainer } from '../details.container';
import { DetailsService } from '../details.service';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { addNecessaryIcons } from 'utils';

jest.mock('heic2any', () => jest.fn());

jest.mock('localization');
addNecessaryIcons();

describe('DetailsComponent', () => {
  let component: DetailsContainer;
  let fixture: ComponentFixture<DetailsContainer>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: DetailsService,
          useValue: {
            bite: signal(undefined),
            reviews: signal(undefined),
            currentPosition: signal(undefined),
            bucketlists: signal(undefined),
            userId: signal(undefined),
            biteCreator: signal(undefined),
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            isAuthenticated: (): void => {},
          },
        },
      ],
    });

    fixture = TestBed.createComponent(DetailsContainer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
