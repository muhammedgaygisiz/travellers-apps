import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Review, ReviewThread } from 'model';
import { addNecessaryIcons } from 'utils';
import {
  ReviewReplySubmit,
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
  }): void => {
    componentRef.setInput('thread', inputs.thread);
    componentRef.setInput('canReply', inputs.canReply ?? true);
    componentRef.setInput('highlighted', inputs.highlighted ?? false);
    componentRef.setInput('biteCreatorId', inputs.biteCreatorId);
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

  it('opens a long thread the notification pointed at', () => {
    render({
      thread: thread([reply('reply-1'), reply('reply-2'), reply('reply-3')]),
      highlighted: true,
    });

    expect(query('show-replies')).toBeNull();
    expect(query('reply-reply-3')).toBeTruthy();
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
});
