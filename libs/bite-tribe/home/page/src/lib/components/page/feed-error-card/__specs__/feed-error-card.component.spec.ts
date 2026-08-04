import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { FeedErrorCardComponent } from '../feed-error-card.component';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('FeedErrorCardComponent', () => {
  let component: FeedErrorCardComponent;
  let fixture: ComponentFixture<FeedErrorCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(FeedErrorCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should name the failure', () => {
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="feed-error-message"]'),
    ).not.toBeNull();
  });

  it('should ask for another attempt on retry', () => {
    fixture.detectChanges();
    const retrySpy = jest.spyOn(component.retryClick, 'emit');

    fixture.nativeElement
      .querySelector('[data-testid="feed-error-retry"]')
      .click();

    expect(retrySpy).toHaveBeenCalledTimes(1);
  });
});
