import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pipe, PipeTransform } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { addNecessaryIcons } from 'utils';
import {
  BiteExplanationComponent,
  type BiteExplanationState,
} from '../bite-explanation.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

addNecessaryIcons();

describe(BiteExplanationComponent.name, () => {
  let fixture: ComponentFixture<BiteExplanationComponent>;

  const render = (state: BiteExplanationState): HTMLElement => {
    fixture.componentRef.setInput('dishName', 'Som Tam');
    fixture.componentRef.setInput('state', state);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  const byTestId = (root: HTMLElement, id: string): HTMLElement | null =>
    root.querySelector(`[data-testid="${id}"]`);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular()],
    }).overrideComponent(BiteExplanationComponent, {
      remove: { imports: [TranslocoPipe] },
      add: { imports: [MockTranslocoPipe] },
    });

    fixture = TestBed.createComponent(BiteExplanationComponent);
  });

  it('shows the three parts under an AI title', () => {
    const root = render({
      kind: 'ok',
      explanation: {
        whatItIs: 'A pounded papaya salad.',
        origin: 'Isan, Thailand.',
        ingredients: ['papaya', 'lime', 'chilli'],
      },
    });

    expect(root.textContent).toContain('bite-explanation-title');
    expect(root.textContent).toContain('Som Tam');
    expect(byTestId(root, 'bite-explanation-what')?.textContent).toContain(
      'A pounded papaya salad.',
    );
    expect(byTestId(root, 'bite-explanation-origin')?.textContent).toContain(
      'Isan, Thailand.',
    );
    expect(
      byTestId(root, 'bite-explanation-ingredients')?.querySelectorAll('li'),
    ).toHaveLength(3);
  });

  it.each([
    [{ kind: 'loading' }, 'bite-explanation-loading'],
    [{ kind: 'unknown' }, 'bite-explanation-unknown'],
    [{ kind: 'limit' }, 'bite-explanation-limit'],
    [{ kind: 'error' }, 'bite-explanation-error'],
  ] as [BiteExplanationState, string][])(
    'answers %j with its own message, and the disclaimer under it',
    (state, testId) => {
      const root = render(state);

      expect(byTestId(root, testId)).toBeTruthy();
      expect(
        byTestId(root, 'bite-explanation-disclaimer')?.textContent,
      ).toContain('bite-explanation-disclaimer');
    },
  );

  it('offers Retry only after a failure', () => {
    const retried = jest.spyOn(fixture.componentInstance.retry, 'emit');

    expect(
      byTestId(render({ kind: 'limit' }), 'bite-explanation-retry'),
    ).toBeFalsy();

    byTestId(render({ kind: 'error' }), 'bite-explanation-retry')?.click();

    expect(retried).toHaveBeenCalled();
  });

  it('closes on Done', () => {
    const closed = jest.spyOn(fixture.componentInstance.closed, 'emit');

    byTestId(render({ kind: 'loading' }), 'bite-explanation-close')?.click();

    expect(closed).toHaveBeenCalled();
  });
});
