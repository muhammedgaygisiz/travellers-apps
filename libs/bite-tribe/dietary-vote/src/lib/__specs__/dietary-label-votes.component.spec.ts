import { TestBed } from '@angular/core/testing';
import { Pipe, PipeTransform } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DietaryLabelVotesComponent } from '../dietary-label-votes.component';

@Pipe({ name: 'transloco' })
class KeyPipe implements PipeTransform {
  transform(value: string, params?: { count?: number }): string {
    return params?.count === undefined ? value : `${value}:${params.count}`;
  }
}

/** See GitHub issue #2197. */
describe(DietaryLabelVotesComponent.name, () => {
  beforeEach(() => {
    TestBed.overrideComponent(DietaryLabelVotesComponent, {
      remove: { imports: [TranslocoPipe] },
      add: { imports: [KeyPipe] },
    });
  });

  const render = (inputs: Record<string, unknown>): string => {
    const fixture = TestBed.createComponent(DietaryLabelVotesComponent);

    Object.entries(inputs).forEach(([name, value]) =>
      fixture.componentRef.setInput(name, value),
    );
    fixture.detectChanges();

    return (fixture.nativeElement as HTMLElement).textContent?.trim() ?? '';
  };

  it('shows how many diners confirm and dispute, and the own vote', () => {
    const text = render({
      tally: { confirm: 7, dispute: 3 },
      ownVote: 'dispute',
    });

    expect(text).toContain('dietary-votes-confirmed:7');
    expect(text).toContain('dietary-votes-disputed:3');
    expect(text).toContain('dietary-vote-own-dispute');
  });

  it('leaves out a count of zero, and shows nothing without votes', () => {
    expect(render({ tally: { confirm: 0, dispute: 2 } })).toBe(
      'dietary-votes-disputed:2',
    );
  });

  it('shows nothing for a label nobody voted on', () => {
    expect(render({})).toBe('');
  });
});
