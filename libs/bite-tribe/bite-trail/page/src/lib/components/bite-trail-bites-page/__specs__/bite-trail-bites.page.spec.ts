import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BiteTrailBitesPage } from '../bite-trail-bites.page';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(BiteTrailBitesPage.name, () => {
  let component: BiteTrailBitesPage;
  let fixture: ComponentFixture<BiteTrailBitesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiteTrailBitesPage],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BiteTrailBitesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('given the trail could not be read', () => {
    // An unreadable trail is not an empty one: the empty-state message claims
    // the trail has no Bites, which would be untrue. See issue #1232.
    it('should report the failure instead of claiming the trail is empty', () => {
      fixture.componentRef.setInput('hasError', true);
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="bite-trail-error-message"]',
        ),
      ).toBeTruthy();
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="bite-trail-empty-message"]',
        ),
      ).toBeNull();
    });

    it('should offer the read again', () => {
      jest.spyOn(component.retryClick, 'emit');
      fixture.componentRef.setInput('hasError', true);
      fixture.detectChanges();

      fixture.nativeElement
        .querySelector('[data-testid="bite-trail-error-retry"]')
        .click();

      expect(component.retryClick.emit).toHaveBeenCalled();
    });
  });

  describe('given the trail is simply empty', () => {
    it('should say so', () => {
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="bite-trail-error-message"]',
        ),
      ).toBeNull();
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="bite-trail-empty-message"]',
        ),
      ).toBeTruthy();
    });
  });
});
