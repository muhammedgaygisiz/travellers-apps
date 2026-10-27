import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import type { PublicUser } from 'model';
import { getIonicConfig } from 'utils';
import { GLOBE_OUTLINE_LOADER } from 'bite-tribe-common/map/globe';
import { WorldContainer } from '../world.container';
import { ProfileService } from '../profile.service';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of('en'),
  getActiveLang: (): string => 'en',
};

const OWNER: PublicUser = {
  userId: 'owner',
  displayName: 'Leela',
  about: '',
  email: '',
  photoUrl: '',
  countryCodes: ['JP', 'TH'],
};

/** GitHub issue #1787. */
describe(WorldContainer.name, () => {
  let fixture: ComponentFixture<WorldContainer>;
  let container: WorldContainer;

  const user = signal<PublicUser | undefined>(undefined);
  const myUser = signal<PublicUser | undefined>(undefined);
  const service = {
    userValue: user,
    myUser,
    user: { isLoading: (): boolean => false },
    trackWorldOpened: jest.fn(),
    trackWorldCountryTapped: jest.fn(),
    trackWorldZoomed: jest.fn(),
  };

  beforeEach(() => {
    user.set(undefined);
    myUser.set({ ...OWNER, userId: 'me' });
    jest.clearAllMocks();
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: ProfileService, useValue: service },
        { provide: TranslocoService, useValue: MockTranslocoService },
        {
          provide: GLOBE_OUTLINE_LOADER,
          useValue: (): Promise<never> => new Promise(() => undefined),
        },
      ],
    });
    fixture = TestBed.createComponent(WorldContainer);
    container = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => jest.restoreAllMocks());

  it("should log the opening once the profile is known, as somebody else's", () => {
    container.ionViewDidEnter();
    TestBed.tick();
    expect(service.trackWorldOpened).not.toHaveBeenCalled();

    user.set(OWNER);
    TestBed.tick();

    expect(service.trackWorldOpened).toHaveBeenCalledTimes(1);
    expect(service.trackWorldOpened).toHaveBeenCalledWith(false);
  });

  it('should log the opening of the own globe as the own profile', () => {
    myUser.set(OWNER);
    user.set(OWNER);
    container.ionViewDidEnter();
    TestBed.tick();

    expect(service.trackWorldOpened).toHaveBeenCalledWith(true);
  });

  it('should log the opening again when the page is entered again', () => {
    user.set(OWNER);
    container.ionViewDidEnter();
    TestBed.tick();
    container.ionViewDidEnter();
    TestBed.tick();

    expect(service.trackWorldOpened).toHaveBeenCalledTimes(2);
  });

  it('should log a country tap with whether it has Bites', () => {
    container.onCountryTap({ countryCode: 'TH', visited: true });

    expect(service.trackWorldCountryTapped).toHaveBeenCalledWith('TH', true);
  });

  it('should log only the first zoom of a visit', () => {
    container.ionViewDidEnter();
    container.onZoomed('gesture');
    container.onZoomed('button');

    expect(service.trackWorldZoomed).toHaveBeenCalledTimes(1);
    expect(service.trackWorldZoomed).toHaveBeenCalledWith('gesture');

    container.ionViewDidEnter();
    container.onZoomed('button');

    expect(service.trackWorldZoomed).toHaveBeenCalledTimes(2);
  });
});
