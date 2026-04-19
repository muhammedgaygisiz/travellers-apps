import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailsContainer } from '../details.container';
import { DetailsService } from '../details.service';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { addNecessaryIcons } from 'utils';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';

jest.mock('@capacitor-firebase/analytics');

jest.mock('heic2any', () => jest.fn());

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(DetailsContainer.name, () => {
  let component: DetailsContainer;
  let fixture: ComponentFixture<DetailsContainer>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: DetailsService,
          useValue: {
            bite: {
              value: signal(undefined),
              error: signal(undefined),
              reload: jest.fn(),
            },
            position: {
              value: signal(undefined),
              error: signal(undefined),
              reload: jest.fn(),
            },
            reviews: signal(undefined),
            currentPosition: {
              value: signal(undefined),
            },
            bucketlists: signal(undefined),
            userId: signal(undefined),
            biteCreator: {
              value: signal(undefined),
              reload: jest.fn(),
            },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            isAuthenticated: (): void => {},
          },
        },
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(DetailsContainer);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ionViewDidEnter', () => {
    let setCurrentScreenSpy: jest.SpyInstance;

    beforeEach(() => {
      setCurrentScreenSpy = jest.spyOn(FirebaseAnalytics, 'setCurrentScreen');
    });

    it('should call FirebaseAnalytics.setCurrentScreen with correct screen name', () => {
      component.ionViewDidEnter();

      expect(setCurrentScreenSpy).toHaveBeenCalledWith({
        screenName: 'Bite Details',
      });
    });
  });
});
