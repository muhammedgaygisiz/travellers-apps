import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Review, ReviewThread } from 'model';
import { addNecessaryIcons } from 'utils';
import {
  ReviewDeleteRequest,
  ReviewEditSubmit,
  ReviewReplySubmit,
  ReviewReportRequest,
  ReviewThreadComponent,
} from '../review-thread.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

addNecessaryIcons();

const review = (overrides: Partial<Review> & { id: string }): Review => ({
  author: 'Mira',
  biteId: '/bites/bite-1',
  review: 'Best kebab in Kreuzberg.',
  authorId: 'mira',
  ...overrides,
});

const reply = (id: string, overrides: Partial<Review> = {}): Review =>
  review({
    id,
    author: 'Jonas',
    authorId: 'jonas',
    review: 'Was it very spicy?',
    parentReviewId: 'root-1',
    threadId: 'root-1',
    ...overrides,
  });

const thread = (replies: Review[] = []): ReviewThread => ({
  root: review({ id: 'root-1' }),
  replies,
});

describe(ReviewThreadComponent.name, () => {
  let fixture: ComponentFixture<ReviewThreadComponent>;
  let component: ReviewThreadComponent;
  let componentRef: ComponentRef<ReviewThreadComponent>;

  const render = (inputs: {
    thread: ReviewThread;
    canReply?: boolean;
    highlighted?: boolean;
    biteCreatorId?: string;
    userId?: string;
  }): void => {
    componentRef.setInput('thread', inputs.thread);
    componentRef.setInput('canReply', inputs.canReply ?? true);
    componentRef.setInput('highlighted', inputs.highlighted ?? false);
    componentRef.setInput('biteCreatorId', inputs.biteCreatorId);
    componentRef.setInput('userId', inputs.userId);
    componentRef.changeDetectorRef.detectChanges();
  };

  const query = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular()],
    })
      .overrideComponent(ReviewThreadComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ReviewThreadComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('offers a reply action on the root review to an authenticated user', () => {
    render({ thread: thread(), canReply: true });

    expect(query('reply-to-review')).toBeTruthy();
  });

  it('offers no reply action to a signed-out visitor', () => {
    render({ thread: thread(), canReply: false });

    expect(query('reply-to-review')).toBeNull();
  });

  it('attaches an answer to the root review it was opened from', () => {
    const submitted: ReviewReplySubmit[] = [];
    render({ thread: thread() });
    component.submitReply.subscribe((event) => submitted.push(event));

    query('reply-to-review')?.click();
    fixture.detectChanges();

    component['replyForm'].setValue({ review: 'Thanks!' });
    query('submit-reply')?.click();

    expect(submitted).toEqual([
      { review: 'Thanks!', parentReviewId: 'root-1', threadId: 'root-1' },
    ]);
  });

  it('keeps an answer to a reply in the same thread and prefills the mention', () => {
    const submitted: ReviewReplySubmit[] = [];
    render({ thread: thread([reply('reply-1')]) });
    component.submitReply.subscribe((event) => submitted.push(event));

    query('reply-to-reply')?.click();
    fixture.detectChanges();

    expect(component['replyForm'].getRawValue().review).toBe('@Jonas ');

    component['replyForm'].setValue({ review: '@Jonas not at all' });
    query('submit-reply')?.click();

    expect(submitted).toEqual([
      {
        review: '@Jonas not at all',
        parentReviewId: 'reply-1',
        threadId: 'root-1',
      },
    ]);
  });

  it('keeps the label off the line the reply is typed on', () => {
    render({ thread: thread() });

    query('reply-to-review')?.click();
    fixture.detectChanges();

    // The label reads "Reply to {{name}}", so inline it took the width of the
    // author's name away from the input and left a strip to type in on a phone
    // (issue #1309). Stacked, the name cannot reach the typing area at all.
    expect(query('reply-input')?.getAttribute('labelplacement')).toBe(
      'stacked',
    );
  });

  it('closes the composer on cancel without submitting', () => {
    const submitted: ReviewReplySubmit[] = [];
    render({ thread: thread() });
    component.submitReply.subscribe((event) => submitted.push(event));

    query('reply-to-review')?.click();
    fixture.detectChanges();

    query('cancel-reply')?.click();
    fixture.detectChanges();

    expect(query('reply-input')).toBeNull();
    expect(submitted).toEqual([]);
  });

  it('shows two replies without asking', () => {
    render({ thread: thread([reply('reply-1'), reply('reply-2')]) });

    expect(query('show-replies')).toBeNull();
    expect(query('reply-reply-1')).toBeTruthy();
    expect(query('reply-reply-2')).toBeTruthy();
  });

  it('collapses a thread of more than two replies behind a control', () => {
    render({
      thread: thread([reply('reply-1'), reply('reply-2'), reply('reply-3')]),
    });

    expect(query('show-replies')).toBeTruthy();
    expect(query('reply-reply-1')).toBeNull();

    query('show-replies')?.click();
    fixture.detectChanges();

    expect(query('reply-reply-1')).toBeTruthy();
    expect(query('hide-replies')).toBeTruthy();
  });

  it('folds an expanded thread back', () => {
    render({
      thread: thread([reply('reply-1'), reply('reply-2'), reply('reply-3')]),
    });

    query('show-replies')?.click();
    fixture.detectChanges();

    query('hide-replies')?.click();
    fixture.detectChanges();

    expect(query('reply-reply-1')).toBeNull();
    expect(query('show-replies')).toBeTruthy();
  });

  it('opens a long thread the notification pointed at', () => {
    render({
      thread: thread([reply('reply-1'), reply('reply-2'), reply('reply-3')]),
      highlighted: true,
    });

    expect(query('show-replies')).toBeNull();
    expect(query('reply-reply-3')).toBeTruthy();
  });

  it('brings a highlighted thread onto the screen', () => {
    // The review compartment sits far below the fold, so the mark alone would
    // not be enough for a reader arriving from a notification.
    const scrollIntoView = jest.fn();
    fixture.nativeElement.scrollIntoView = scrollIntoView;

    render({ thread: thread(), highlighted: true });

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
  });

  it('leaves a thread nobody was sent to where it is', () => {
    const scrollIntoView = jest.fn();
    fixture.nativeElement.scrollIntoView = scrollIntoView;

    render({ thread: thread(), highlighted: false });

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('refuses a reply that is only whitespace', () => {
    const submitted: ReviewReplySubmit[] = [];
    render({ thread: thread() });
    component.submitReply.subscribe((event) => submitted.push(event));

    query('reply-to-review')?.click();
    fixture.detectChanges();

    component['replyForm'].setValue({ review: '   ' });
    query('submit-reply')?.click();

    expect(submitted).toEqual([]);
  });

  it('sends nothing when no composer is open', () => {
    // The button only exists while the composer does, so this guards the
    // component's own contract rather than a reachable click.
    const submitted: ReviewReplySubmit[] = [];
    render({ thread: thread() });
    component.submitReply.subscribe((event) => submitted.push(event));

    component['submit']();

    expect(submitted).toEqual([]);
  });

  it('marks the Bite creator so their answer is distinguishable', () => {
    render({
      thread: thread([reply('reply-1', { authorId: 'ali', author: 'Ali' })]),
      biteCreatorId: 'ali',
    });

    expect(
      fixture.nativeElement.querySelectorAll('.creator-badge').length,
    ).toBe(1);
  });

  it('leaves a legacy review without an author uid unmarked', () => {
    render({
      thread: {
        root: review({ id: 'root-1', authorId: undefined }),
        replies: [],
      },
      biteCreatorId: 'ali',
    });

    expect(fixture.nativeElement.querySelector('.creator-badge')).toBeNull();
  });

  /** Editing one's own review or reply in place (issue #721). */
  describe('editing', () => {
    const queryAll = (testId: string): HTMLElement[] =>
      Array.from(
        fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`),
      );

    const edits = (): ReviewEditSubmit[] => {
      const submitted: ReviewEditSubmit[] = [];
      component.submitEdit.subscribe((event) => submitted.push(event));

      return submitted;
    };

    const openEditor = (): void => {
      query('edit-review')?.click();
      fixture.detectChanges();
    };

    it('offers an edit on the signed-in user’s own review and reply only', () => {
      render({
        thread: thread([
          reply('reply-1'),
          reply('reply-2', { authorId: 'mira', author: 'Mira' }),
        ]),
        userId: 'mira',
      });

      // The root and reply-2 are Mira's; reply-1 is Jonas's.
      expect(queryAll('edit-review')).toHaveLength(2);
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="reply-reply-1"] [data-testid="edit-review"]',
        ),
      ).toBeNull();
    });

    it('offers the Bite creator no edit on somebody else’s review', () => {
      render({ thread: thread(), biteCreatorId: 'ali', userId: 'ali' });

      expect(query('edit-review')).toBeNull();
    });

    it('offers no edit while signed out', () => {
      render({ thread: thread(), canReply: false, userId: undefined });

      expect(query('edit-review')).toBeNull();
    });

    it('offers no edit on a legacy review without an author uid', () => {
      render({
        thread: {
          root: review({ id: 'root-1', authorId: undefined }),
          replies: [],
        },
        userId: 'mira',
      });

      expect(query('edit-review')).toBeNull();
    });

    it('swaps the text for an editor holding it', () => {
      render({ thread: thread(), userId: 'mira' });

      openEditor();

      expect(query('edit-review-input')).toBeTruthy();
      expect(component['editForm'].getRawValue().review).toBe(
        'Best kebab in Kreuzberg.',
      );
      expect(fixture.nativeElement.textContent).not.toContain(
        'Best kebab in Kreuzberg.',
      );
    });

    it('hands the trimmed new text to the page and closes the editor', () => {
      render({ thread: thread(), userId: 'mira' });
      const submitted = edits();

      openEditor();
      component['editForm'].setValue({ review: '  Best kebab, slow queue. ' });
      fixture.detectChanges();
      query('save-edit')?.click();
      fixture.detectChanges();

      expect(submitted).toEqual([
        { reviewId: 'root-1', review: 'Best kebab, slow queue.' },
      ]);
      expect(query('edit-review-input')).toBeNull();
    });

    it('writes nothing when no editor is open', () => {
      render({ thread: thread(), userId: 'mira' });
      const submitted = edits();

      component['saveEdit']();

      expect(submitted).toEqual([]);
    });

    it('writes nothing when the text did not change', () => {
      render({ thread: thread(), userId: 'mira' });
      const submitted = edits();

      openEditor();
      component['saveEdit']();

      expect(submitted).toEqual([]);
    });

    it('cancels back to the original text and writes nothing', () => {
      render({ thread: thread(), userId: 'mira' });
      const submitted = edits();

      openEditor();
      component['editForm'].setValue({ review: 'Changed my mind' });
      query('cancel-edit')?.click();
      fixture.detectChanges();

      expect(submitted).toEqual([]);
      expect(fixture.nativeElement.textContent).toContain(
        'Best kebab in Kreuzberg.',
      );
    });

    it.each([
      ['empty', ''],
      ['whitespace only', '  \n '],
    ])('refuses to save %s text', (_label, text) => {
      render({ thread: thread(), userId: 'mira' });
      const submitted = edits();

      openEditor();
      component['editForm'].setValue({ review: text });
      fixture.detectChanges();

      expect(component['editForm'].invalid).toBe(true);
      component['saveEdit']();
      expect(submitted).toEqual([]);
    });

    it('closes an open reply composer, and replying closes the editor', () => {
      render({ thread: thread(), userId: 'mira' });

      query('reply-to-review')?.click();
      fixture.detectChanges();
      openEditor();

      expect(query('reply-input')).toBeNull();
      expect(query('edit-review-input')).toBeTruthy();

      component['startReply'](component.thread().root);
      fixture.detectChanges();

      expect(query('edit-review-input')).toBeNull();
      expect(query('reply-input')).toBeTruthy();
    });

    it('marks an edited review and reply, and leaves the others unmarked', () => {
      render({
        thread: {
          root: review({
            id: 'root-1',
            updatedAt: '2026-11-18T12:00:00.000Z',
          }),
          replies: [
            reply('reply-1', { updatedAt: '2026-11-18T12:00:00.000Z' }),
            reply('reply-2'),
          ],
        },
      });

      expect(queryAll('edited-marker')).toHaveLength(2);
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="reply-reply-2"] [data-testid="edited-marker"]',
        ),
      ).toBeNull();
    });
  });

  /** Issue #2116: withdrawing one's own review or reply. */
  describe('deleting', () => {
    const queryAll = (testId: string): HTMLElement[] =>
      Array.from(
        fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`),
      );

    const requests = (): ReviewDeleteRequest[] => {
      const requested: ReviewDeleteRequest[] = [];
      component.deleteReview.subscribe((event) => requested.push(event));

      return requested;
    };

    const tombstone = (overrides: Partial<Review> & { id: string }): Review =>
      review({
        author: '',
        authorId: undefined,
        review: '',
        deletedAt: '2026-11-18T12:00:00.000Z',
        ...overrides,
      });

    it('offers a delete on the signed-in user’s own review and reply only', () => {
      render({
        thread: thread([
          reply('reply-1'),
          reply('reply-2', { authorId: 'mira' }),
        ]),
        userId: 'mira',
      });

      expect(queryAll('delete-review')).toHaveLength(2);
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="reply-reply-1"] [data-testid="delete-review"]',
        ),
      ).toBeNull();
    });

    it('offers the Bite creator no delete on somebody else’s review', () => {
      render({ thread: thread(), userId: 'creator', biteCreatorId: 'creator' });

      expect(query('delete-review')).toBeNull();
    });

    it('offers no delete on a legacy review without an author uid', () => {
      render({
        thread: {
          root: review({ id: 'root-1', authorId: undefined }),
          replies: [],
        },
        userId: 'mira',
      });

      expect(query('delete-review')).toBeNull();
    });

    it('asks the page to delete a review, naming it a review', () => {
      render({ thread: thread(), userId: 'mira' });
      const requested = requests();

      query('delete-review')?.click();

      expect(requested).toEqual([{ reviewId: 'root-1', isReply: false }]);
    });

    it('asks the page to delete a reply, naming it a reply', () => {
      render({
        thread: thread([reply('reply-1', { authorId: 'mira' })]),
        userId: 'mira',
      });
      const requested = requests();

      fixture.nativeElement
        .querySelector(
          '[data-testid="reply-reply-1"] [data-testid="delete-review"]',
        )
        .click();

      expect(requested).toEqual([{ reviewId: 'reply-1', isReply: true }]);
    });

    it('closes an open editor before asking', () => {
      render({ thread: thread(), userId: 'mira' });
      query('edit-review')?.click();
      fixture.detectChanges();

      component['requestDelete'](component.thread().root);
      fixture.detectChanges();

      expect(query('edit-review-input')).toBeNull();
    });

    it('shows a deleted root in its place, with its replies still under it', () => {
      render({
        thread: {
          root: tombstone({ id: 'root-1' }),
          replies: [reply('reply-1')],
        },
        userId: 'jonas',
      });

      expect(query('deleted-review')?.textContent?.trim()).toBe(
        'review-deleted',
      );
      expect(query('reply-reply-1')?.textContent).toContain(
        'Was it very spicy?',
      );
    });

    it('names a deleted reply as a reply', () => {
      render({
        thread: thread([
          tombstone({ id: 'reply-1', parentReviewId: 'root-1' }),
        ]),
      });

      expect(query('deleted-review')?.textContent?.trim()).toBe(
        'reply-deleted',
      );
    });

    it('offers nothing on a deleted item: no reply, edit or delete', () => {
      render({
        thread: { root: tombstone({ id: 'root-1' }), replies: [] },
        userId: 'mira',
      });

      expect(query('reply-to-review')).toBeNull();
      expect(query('edit-review')).toBeNull();
      expect(query('delete-review')).toBeNull();
    });
  });

  describe('reporting', () => {
    const queryAll = (testId: string): HTMLElement[] =>
      Array.from(
        fixture.nativeElement.querySelectorAll(`[data-testid="${testId}"]`),
      );

    const requests = (): ReviewReportRequest[] => {
      const requested: ReviewReportRequest[] = [];
      component.reportReview.subscribe((event) => requested.push(event));

      return requested;
    };

    it('offers a report on every item the signed-in member did not write', () => {
      render({
        thread: thread([
          reply('reply-1'),
          reply('reply-2', { authorId: 'mira' }),
        ]),
        userId: 'mira',
      });

      expect(queryAll('report-review')).toHaveLength(1);
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="reply-reply-1"] [data-testid="report-review"]',
        ),
      ).not.toBeNull();
    });

    it('offers a reader who took no part a report on every item', () => {
      render({ thread: thread([reply('reply-1')]), userId: 'ali' });

      expect(queryAll('report-review')).toHaveLength(2);
    });

    it('offers no report while signed out or as a guest', () => {
      render({ thread: thread([reply('reply-1')]), canReply: false });

      expect(query('report-review')).toBeNull();
    });

    it('offers no report on a tombstone', () => {
      render({
        thread: {
          root: review({
            id: 'root-1',
            author: '',
            authorId: undefined,
            review: '',
            deletedAt: '2026-11-18T12:00:00.000Z',
          }),
          replies: [],
        },
        userId: 'ali',
      });

      expect(query('report-review')).toBeNull();
    });

    it('asks the page to report a reply, naming it a reply', () => {
      render({ thread: thread([reply('reply-1')]), userId: 'mira' });
      const requested = requests();

      query('report-review')?.click();

      expect(requested).toEqual([{ reviewId: 'reply-1', isReply: true }]);
    });

    it('asks the page to report a review, naming it a review', () => {
      render({ thread: thread(), userId: 'ali' });
      const requested = requests();

      query('report-review')?.click();

      expect(requested).toEqual([{ reviewId: 'root-1', isReply: false }]);
    });
  });

  /** Issue #2118: an item an operator hid. */
  describe('hidden items', () => {
    const hidden = (
      overrides: Partial<Review> & { id: string },
      keptText?: string,
    ): Review =>
      review({
        author: '',
        review: '',
        hiddenAt: '2026-11-18T12:00:00.000Z',
        ...(keptText === undefined ? {} : { hiddenReview: keptText }),
        ...overrides,
      });

    it('shows a hidden root in its place, with its replies still under it', () => {
      render({
        thread: { root: hidden({ id: 'root-1' }), replies: [reply('reply-1')] },
        userId: 'jonas',
      });

      expect(query('hidden-review')?.textContent?.trim()).toBe('review-hidden');
      expect(query('reply-reply-1')?.textContent).toContain(
        'Was it very spicy?',
      );
    });

    it('names a hidden reply as a reply', () => {
      render({
        thread: thread([
          hidden({
            id: 'reply-1',
            authorId: 'jonas',
            parentReviewId: 'root-1',
          }),
        ]),
        userId: 'mira',
      });

      expect(query('hidden-review')?.textContent?.trim()).toBe('reply-hidden');
    });

    it('offers another reader nothing on it: no reply, edit, delete or report', () => {
      render({
        thread: { root: hidden({ id: 'root-1' }), replies: [] },
        userId: 'jonas',
      });

      expect(query('reply-to-review')).toBeNull();
      expect(query('edit-review')).toBeNull();
      expect(query('delete-review')).toBeNull();
      expect(query('report-review')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Mira');
    });

    it('shows its author the kept text under the marker, with only a delete', () => {
      render({
        thread: {
          root: hidden({ id: 'root-1' }, 'Best kebab in Kreuzberg.'),
          replies: [],
        },
        userId: 'mira',
      });

      expect(query('hidden-marker')?.textContent?.trim()).toBe(
        'review-hidden-own-marker',
      );
      expect(query('own-hidden-review')?.textContent).toContain(
        'Best kebab in Kreuzberg.',
      );
      expect(query('delete-review')).toBeTruthy();
      expect(query('edit-review')).toBeNull();
      expect(query('reply-to-review')).toBeNull();
    });

    it('shows the kept text to nobody but the author', () => {
      // Defence in depth: the loader never reads it for anybody else.
      render({
        thread: {
          root: hidden({ id: 'root-1' }, 'Best kebab in Kreuzberg.'),
          replies: [],
        },
        userId: 'jonas',
      });

      expect(query('own-hidden-review')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Best kebab');
    });

    it('lets its author ask to delete it', () => {
      render({
        thread: {
          root: hidden({ id: 'root-1' }, 'Best kebab in Kreuzberg.'),
          replies: [],
        },
        userId: 'mira',
      });
      const requested: ReviewDeleteRequest[] = [];
      component.deleteReview.subscribe((event) => requested.push(event));

      query('delete-review')?.click();

      expect(requested).toEqual([{ reviewId: 'root-1', isReply: false }]);
    });
  });
});
