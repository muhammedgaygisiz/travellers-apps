import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { getIonicConfig } from 'utils';
import type { PublicUser } from 'model';
import {
  AteWithPickerComponent,
  MAX_TAGGED_USERS,
} from '../ate-with-picker.component';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  getActiveLang: jest.fn(() => 'en'),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

const user = (userId: string, displayName: string): PublicUser => ({
  userId,
  displayName,
  email: '',
  photoUrl: '',
  public: true,
});

const ANNA = user('anna', 'Anna');
const BEN = user('ben', 'Ben');
const HANNAH = user('hannah', 'Hannah');

describe('AteWithPickerComponent', () => {
  let fixture: ComponentFixture<AteWithPickerComponent>;
  let component: AteWithPickerComponent;
  let componentRef: ComponentRef<AteWithPickerComponent>;
  let emitted: string[][];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(AteWithPickerComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('candidates', [ANNA, BEN, HANNAH]);
    emitted = [];
    component.selectedIdsChange.subscribe((ids) => emitted.push(ids));
    fixture.detectChanges();
  });

  it('offers the candidates not yet picked', () => {
    componentRef.setInput('selectedIds', ['ben']);

    expect(component.matches().map((match) => match.userId)).toEqual([
      'anna',
      'hannah',
    ]);
  });

  it('filters candidates by display name, ignoring case', () => {
    component.onQuery('ANN');

    expect(component.matches().map((match) => match.userId)).toEqual([
      'anna',
      'hannah',
    ]);
  });

  it('adds a picked user and clears the search', () => {
    componentRef.setInput('selectedIds', ['ben']);
    component.onQuery('ann');
    component.add('anna');

    expect(emitted).toEqual([['ben', 'anna']]);
    expect(component.query()).toBe('');
  });

  it('removes a chip', () => {
    componentRef.setInput('selectedIds', ['ben', 'anna']);
    component.remove('ben');

    expect(emitted).toEqual([['anna']]);
  });

  it(`does not add an ${MAX_TAGGED_USERS + 1}th user`, () => {
    const full = Array.from(
      { length: MAX_TAGGED_USERS },
      (_, index) => `friend-${index}`,
    );
    componentRef.setInput('selectedIds', full);
    fixture.detectChanges();

    component.add('anna');

    expect(emitted).toEqual([]);
    expect(component.atLimit()).toBe(true);
    expect(
      fixture.nativeElement.querySelector('[data-testid="ate-with-limit"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('ion-input')).toBeNull();
  });

  it('names a chip from the known users when the uid is no candidate', () => {
    componentRef.setInput('knownUsers', [user('old-friend', 'Olga')]);
    componentRef.setInput('selectedIds', ['old-friend', 'unknown']);

    expect(component.selectedUsers()).toEqual([
      { userId: 'old-friend', displayName: 'Olga' },
      { userId: 'unknown', displayName: '' },
    ]);
  });

  it('says why nobody can be tagged when the creator follows nobody', () => {
    componentRef.setInput('candidates', []);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="ate-with-no-candidates"]',
      ),
    ).not.toBeNull();
  });
});
