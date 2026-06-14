import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { SearchContainer } from '../search.container';
import { SearchService } from '../search.service';

jest.mock('@capacitor-firebase/analytics');

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

const MockSearchService = {
  searchUsers: jest.fn(),
};

describe(SearchContainer.name, () => {
  let component: SearchContainer;
  let fixture: ComponentFixture<SearchContainer>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
        { provide: SearchService, useValue: MockSearchService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchContainer);
    component = fixture.componentInstance;
    fixture.detectChanges();
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render a searchbar with debounce', () => {
    const searchbar = fixture.nativeElement.querySelector(
      'ion-searchbar',
    ) as HTMLIonSearchbarElement;

    expect(searchbar).toBeTruthy();
    expect(searchbar.debounce).toBe(1000);
  });

  it('should pass the search text to the search service', () => {
    const searchbar = fixture.nativeElement.querySelector(
      'ion-searchbar',
    ) as HTMLIonSearchbarElement;

    searchbar.dispatchEvent(
      new CustomEvent('ionInput', {
        detail: { value: 'Daniel' },
      }),
    );

    expect(MockSearchService.searchUsers).toHaveBeenCalledWith('Daniel');
  });

  it('should set current screen to Search', () => {
    jest.spyOn(FirebaseAnalytics, 'setCurrentScreen');

    component.ionViewDidEnter();

    expect(FirebaseAnalytics.setCurrentScreen).toHaveBeenCalledWith({
      screenName: 'Search',
    });
  });
});
