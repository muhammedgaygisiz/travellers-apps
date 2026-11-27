import { TestBed } from '@angular/core/testing';
import { Pipe, PipeTransform } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DietaryAgreementComponent } from '../dietary-agreement.component';

@Pipe({ name: 'transloco' })
class KeyPipe implements PipeTransform {
  transform(
    value: string,
    params?: { agree?: number; total?: number },
  ): string {
    return params?.total === undefined
      ? value
      : `${value}:${params.agree}/${params.total}`;
  }
}

/** See GitHub issue #2197. */
describe(DietaryAgreementComponent.name, () => {
  beforeEach(() => {
    TestBed.overrideComponent(DietaryAgreementComponent, {
      remove: { imports: [TranslocoPipe] },
      add: { imports: [KeyPipe] },
    });
  });

  const render = (inputs: Record<string, unknown>): HTMLElement => {
    const fixture = TestBed.createComponent(DietaryAgreementComponent);

    Object.entries(inputs).forEach(([name, value]) =>
      fixture.componentRef.setInput(name, value),
    );
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  const testId = (element: HTMLElement, id: string): HTMLElement | null =>
    element.querySelector(`[data-testid="dietary-agreement-${id}"]`);

  it('says how many of the diners agree, and fills the bar to match', () => {
    const element = render({ tally: { confirm: 3, dispute: 1 } });

    expect(testId(element, 'text')?.textContent?.trim()).toBe(
      'dietary-votes-agreeing:3/4',
    );
    expect(testId(element, 'confirm')?.style.width).toBe('75%');
    expect(testId(element, 'own')).toBeNull();
  });

  it('adds the reader own vote', () => {
    const element = render({
      tally: { confirm: 0, dispute: 2 },
      ownVote: 'dispute',
    });

    expect(testId(element, 'confirm')?.style.width).toBe('0%');
    expect(testId(element, 'own')?.textContent).toContain(
      'dietary-vote-own-dispute',
    );
  });

  it('shows nothing for a label nobody voted on', () => {
    expect(render({}).textContent?.trim()).toBe('');
    expect(
      render({ tally: { confirm: 0, dispute: 0 } }).textContent?.trim(),
    ).toBe('');
  });
});
