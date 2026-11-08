import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { getIonicConfig } from 'utils';
import { ONBOARDING_STEPS } from '../../../steps/onboarding-steps';
import { OnboardingPage } from '../onboarding.page';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

// The page's keyboard handling is the subject; the visibility step has no
// injected dependencies, so it keeps the rendered step out of the way.
const VISIBILITY_STEP_INDEX = ONBOARDING_STEPS.findIndex(
  (step) => step.id === 'visibility',
);

describe(OnboardingPage.name, () => {
  let fixture: ComponentFixture<OnboardingPage>;

  const shell = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector(
      '.onboarding-shell',
    ) as HTMLElement;

  const fire = (eventName: string): void => {
    window.dispatchEvent(new Event(eventName));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OnboardingPage],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(OnboardingPage);
    fixture.componentRef.setInput('steps', ONBOARDING_STEPS);
    fixture.componentRef.setInput('currentIndex', VISIBILITY_STEP_INDEX);
    fixture.detectChanges();
  });

  // The sticky step navigation pinned itself over the focused input once the
  // keyboard shrank the web view (#1883).
  describe('keyboard', () => {
    it('keeps the step navigation sticky while no keyboard is open', () => {
      expect(shell().classList).not.toContain(
        'onboarding-shell--keyboard-open',
      );
      expect(shell().querySelector('.onboarding-shell__nav')).not.toBeNull();
    });

    it.each(['keyboardWillShow', 'ionKeyboardDidShow'])(
      'takes the navigation out of sticky on %s',
      (eventName) => {
        fire(eventName);

        expect(shell().classList).toContain('onboarding-shell--keyboard-open');
      },
    );

    it.each([
      ['keyboardWillShow', 'keyboardWillHide'],
      ['ionKeyboardDidShow', 'ionKeyboardDidHide'],
    ])('makes it sticky again when %s is followed by %s', (open, close) => {
      fire(open);
      fire(close);

      expect(shell().classList).not.toContain(
        'onboarding-shell--keyboard-open',
      );
    });

    // A field low on a step, such as the home city, stayed under the keyboard
    // until the user scrolled. The real scroller is ion-content's, so the
    // field sits in a stand-in that records the scroll it is asked for.
    describe('the focused field', () => {
      let content: HTMLElement & { scrollByPoint: jest.Mock };
      let field: HTMLInputElement;

      const focusFieldIn = (
        container: HTMLElement,
        { bottom }: { bottom: number },
      ): void => {
        content = Object.assign(document.createElement('ion-content'), {
          scrollByPoint: jest.fn().mockResolvedValue(undefined),
        });
        field = document.createElement('input');
        field.getBoundingClientRect = (): DOMRect => ({ bottom }) as DOMRect;
        content.appendChild(field);
        container.appendChild(content);
        field.focus();
      };

      // jsdom's window is 768 px tall and has no visual viewport.
      const belowTheFold = { bottom: window.innerHeight + 100 };

      afterEach(() => content.remove());

      it.each(['keyboardDidShow', 'ionKeyboardDidShow'])(
        'is scrolled up by its overhang plus clearance on %s',
        (eventName) => {
          focusFieldIn(shell(), belowTheFold);

          fire(eventName);

          expect(content.scrollByPoint).toHaveBeenCalledWith(0, 124, 200);
        },
      );

      it('is left alone when it already shows above the keyboard', () => {
        focusFieldIn(shell(), { bottom: window.innerHeight - 100 });

        fire('keyboardDidShow');

        expect(content.scrollByPoint).not.toHaveBeenCalled();
      });

      it('is left alone before the keyboard has opened', () => {
        focusFieldIn(shell(), belowTheFold);

        fire('keyboardWillShow');

        expect(content.scrollByPoint).not.toHaveBeenCalled();
      });

      it('is revealed when the web view shrinks under an open keyboard', () => {
        focusFieldIn(shell(), belowTheFold);
        fire('keyboardWillShow');

        fire('resize');

        expect(content.scrollByPoint).toHaveBeenCalled();
      });

      it('is left alone by a resize while no keyboard is open', () => {
        focusFieldIn(shell(), belowTheFold);

        fire('resize');

        expect(content.scrollByPoint).not.toHaveBeenCalled();
      });

      it('is left alone when it is not on the onboarding page', () => {
        focusFieldIn(document.body, belowTheFold);

        fire('keyboardDidShow');

        expect(content.scrollByPoint).not.toHaveBeenCalled();
      });
    });
  });
});
