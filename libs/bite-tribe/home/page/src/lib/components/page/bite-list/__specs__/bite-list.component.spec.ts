import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { InfiniteScrollCustomEvent } from '@ionic/angular';
import { of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { BiteListComponent } from '../bite-list.component';
import type { Bite } from 'model';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

const createBite = (id: string, name: string): Bite => ({
  id,
  name,
  image: '',
  place: 'Bite Place',
  price: 0,
  position: { latitude: 0, longitude: 0 },
});

describe('BiteListComponent', () => {
  let component: BiteListComponent;
  let fixture: ComponentFixture<BiteListComponent>;
  let componentRef: ComponentRef<BiteListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(BiteListComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the empty message when there are no bites', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No bites found. Be the first one.',
    );
  });

  it('should render a bt-bite for each bite', () => {
    componentRef.setInput('bites', [
      createBite('bite-1', 'Burger'),
      createBite('bite-2', 'Pizza'),
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('bt-bite').length).toBe(2);
  });

  it('should show the skeleton list and hide the bites while loading', () => {
    componentRef.setInput('bites', [createBite('bite-1', 'Burger')]);
    componentRef.setInput('showSkeleton', true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('bt-bite-skeleton-list'),
    ).toBeTruthy();
    expect(fixture.nativeElement.querySelector('bt-bite')).toBeNull();
  });

  describe('onTriedOutChange', () => {
    it('should emit triedOutChange with the bite id and checked state', () => {
      const emitSpy = jest.spyOn(component.triedOutChange, 'emit');

      component.onTriedOutChange({ detail: { checked: true } }, 'bite-1');

      expect(emitSpy).toHaveBeenCalledWith({ biteId: 'bite-1', checked: true });
    });
  });

  describe('onIonInfinite', () => {
    it('should emit loadMore and complete the event', () => {
      const emitSpy = jest.spyOn(component.loadMore, 'emit');
      const infiniteScrollEvent = {
        target: {
          complete: jest.fn(),
        },
      } as unknown as InfiniteScrollCustomEvent;

      component.onIonInfinite(infiniteScrollEvent);

      expect(emitSpy).toHaveBeenCalled();
      expect(infiniteScrollEvent.target.complete).toHaveBeenCalled();
    });
  });
});
