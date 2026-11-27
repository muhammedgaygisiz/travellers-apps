import { TestBed } from '@angular/core/testing';
import { Pipe, PipeTransform } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DietaryVoteButtonsComponent } from '../dietary-vote-buttons.component';

@Pipe({ name: 'transloco' })
class KeyPipe implements PipeTransform {
  transform(value: string, params?: { count?: number }): string {
    return params?.count === undefined ? value : `${value}:${params.count}`;
  }
}

/** See GitHub issue #2197. */
describe(DietaryVoteButtonsComponent.name, () => {
  beforeEach(() => {
    TestBed.overrideComponent(DietaryVoteButtonsComponent, {
      remove: { imports: [TranslocoPipe] },
      add: { imports: [KeyPipe] },
    });
  });

  const render = (
    inputs: Record<string, unknown>,
  ): {
    element: HTMLElement;
    component: DietaryVoteButtonsComponent;
  } => {
    const fixture = TestBed.createComponent(DietaryVoteButtonsComponent);

    fixture.componentRef.setInput('label', 'vegan');
    Object.entries(inputs).forEach(([name, value]) =>
      fixture.componentRef.setInput(name, value),
    );
    fixture.detectChanges();

    return {
      element: fixture.nativeElement as HTMLElement,
      component: fixture.componentInstance,
    };
  };

  const node = (element: HTMLElement, vote: string): HTMLElement | null =>
    element.querySelector(`[data-testid="dietary-vote-${vote}"]`);

  it('offers both thumbs with their counts, the own vote pressed', () => {
    const { element, component } = render({
      canVote: true,
      tally: { confirm: 3, dispute: 1 },
      ownVote: 'confirm',
    });
    const votes: string[] = [];

    component.voteClick.subscribe((vote) => votes.push(vote));
    node(element, 'dispute')?.click();

    expect(node(element, 'confirm')?.tagName).toBe('BUTTON');
    expect(node(element, 'confirm')?.textContent?.trim()).toBe('3');
    expect(node(element, 'confirm')?.getAttribute('aria-pressed')).toBe('true');
    expect(node(element, 'dispute')?.getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(node(element, 'dispute')?.getAttribute('aria-label')).toBe(
      'dietary-vote-dispute-on:1',
    );
    expect(votes).toEqual(['dispute']);
  });

  it('offers a vote on a label nobody voted on, at zero', () => {
    const { element } = render({ canVote: true });

    expect(node(element, 'confirm')?.textContent?.trim()).toBe('0');
    expect(node(element, 'dispute')?.textContent?.trim()).toBe('0');
  });

  it('shows plain counts to a viewer who may not vote', () => {
    const { element } = render({ tally: { confirm: 2, dispute: 0 } });

    expect(element.querySelector('button')).toBeNull();
    expect(node(element, 'confirm')?.getAttribute('aria-label')).toBe(
      'dietary-votes-confirmed:2',
    );
    expect(node(element, 'dispute')?.getAttribute('aria-label')).toBe(
      'dietary-votes-disputed:0',
    );
  });

  it('shows nothing to a viewer who may not vote on a label without votes', () => {
    expect(render({}).element.textContent?.trim()).toBe('');
  });
});
