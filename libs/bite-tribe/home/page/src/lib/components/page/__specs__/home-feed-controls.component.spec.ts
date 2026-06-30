import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { HomeFeedControlsComponent } from '../home-feed-controls.component';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('HomeFeedControlsComponent', () => {
  let component: HomeFeedControlsComponent;
  let fixture: ComponentFixture<HomeFeedControlsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(HomeFeedControlsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the filter chip by default', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#select-tags')).toBeTruthy();
  });

  it('should hide the filter chip when showFilters is false', () => {
    fixture.componentRef.setInput('showFilters', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#select-tags')).toBeNull();
  });

  it('should show the number of active filters', () => {
    fixture.componentRef.setInput('hasActiveFilters', true);
    fixture.componentRef.setInput('numberOfFilters', 3);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ion-badge').textContent).toBe(
      '3',
    );
  });

  it('should emit gotoSearch when the search chip is clicked', () => {
    fixture.componentRef.setInput('showSearchChip', true);
    fixture.detectChanges();
    const emitSpy = jest.spyOn(component.gotoSearch, 'emit');

    fixture.nativeElement.querySelector('[data-cy="search-chip"]').click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit openMapView when the map chip is clicked', () => {
    fixture.detectChanges();
    const emitSpy = jest.spyOn(component.openMapView, 'emit');

    fixture.nativeElement
      .querySelector('ion-chip:not(#select-tags):not(#select-sorting)')
      .click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit sortingChange with the new value', () => {
    const emitSpy = jest.spyOn(component.sortingChange, 'emit');

    component.emitSortingChange({ detail: { value: 'likes' } });

    expect(emitSpy).toHaveBeenCalledWith('likes');
  });

  it('should not emit sortingChange if event.detail is undefined', () => {
    const emitSpy = jest.spyOn(component.sortingChange, 'emit');

    component.emitSortingChange({});

    expect(emitSpy).not.toHaveBeenCalled();
  });
});
