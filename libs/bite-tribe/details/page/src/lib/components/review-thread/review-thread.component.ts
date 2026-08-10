import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonNote,
  IonText,
  IonTextarea,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Review, ReviewThread } from 'model';
import { TimeAgoPipe } from '../details-page/pipes/time-ago.pipe';

/**
 * How many replies a thread shows without being asked. A short exchange reads
 * as part of the review it answers; a long one would push the next review off
 * the screen, so it collapses instead (issue #1283).
 */
const ALWAYS_VISIBLE_REPLIES = 2;

/** What the page needs to write the answer the user just typed. */
export interface ReviewReplySubmit {
  review: string;
  parentReviewId: string;
  threadId: string;
}

@Component({
  selector: 'bt-review-thread',
  templateUrl: 'review-thread.component.html',
  styleUrl: 'review-thread.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonNote,
    IonText,
    IonTextarea,
    ReactiveFormsModule,
    TranslocoPipe,
    TimeAgoPipe,
  ],
})
export class ReviewThreadComponent {
  /** The root review and its answers, already in reading order. */
  thread = input.required<ReviewThread>();

  /**
   * The Bite's owner, so an answer from them is distinguishable from another
   * diner's. Everyone may reply, which is exactly why the owner has to be
   * marked rather than assumed.
   */
  biteCreatorId = input<string>();

  /** Replying is open to any authenticated user, and to no one else. */
  canReply = input(false, { transform: booleanAttribute });

  /** Set when a tapped reply notification pointed at this thread. */
  highlighted = input(false, { transform: booleanAttribute });

  /** The language the timestamps are worded in. */
  activeLang = input('en');

  submitReply = output<ReviewReplySubmit>();

  private readonly formBuilder = inject(FormBuilder);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly replyForm = this.formBuilder.nonNullable.group({
    review: ['', Validators.required],
  });

  /** The review the open composer answers, or nothing while it is closed. */
  private readonly answering = signal<Review | undefined>(undefined);

  private readonly expandedByUser = signal(false);

  protected readonly replies = computed(() => this.thread().replies);

  protected readonly isCollapsible = computed(
    () => this.replies().length > ALWAYS_VISIBLE_REPLIES,
  );

  /**
   * A long thread stays folded until it is opened, unless the user was sent
   * here to read it, in which case folding it would hide the very reply the
   * notification was about.
   */
  protected readonly collapsed = computed(
    () => this.isCollapsible() && !this.expandedByUser() && !this.highlighted(),
  );

  /** Folding back is only offered on a thread long enough to have been folded. */
  protected readonly canCollapse = computed(
    () => this.isCollapsible() && !this.collapsed(),
  );

  protected readonly composerOpen = computed(() => !!this.answering());

  /** Whom the composer is addressed to, for its label. */
  protected readonly answeringAuthor = computed(
    () => this.answering()?.author ?? '',
  );

  constructor() {
    effect(() => {
      if (this.highlighted()) {
        this.scrollIntoView();
      }
    });
  }

  /**
   * Brings the thread a notification pointed at onto the screen. The review
   * compartment sits below the photo, the map and the tags, so a deep-linked
   * thread would otherwise open out of sight.
   */
  private scrollIntoView(): void {
    const element = this.host.nativeElement as HTMLElement;

    if (typeof element?.scrollIntoView !== 'function') {
      return;
    }

    element.scrollIntoView({ block: 'center' });
  }

  protected isCreator(review: Review): boolean {
    const creatorId = this.biteCreatorId();

    return !!creatorId && review.authorId === creatorId;
  }

  protected expand(): void {
    this.expandedByUser.set(true);
  }

  protected collapse(): void {
    this.expandedByUser.set(false);
  }

  /**
   * Opens the composer under the thread.
   *
   * Answering a reply does not open a second level: the answer attaches to the
   * same root and only carries an `@name` mention, so who is being addressed
   * survives without the layout growing another indent.
   */
  protected startReply(review: Review): void {
    const isReply = !!review.parentReviewId;

    this.answering.set(review);
    this.expandedByUser.set(true);
    this.replyForm.reset({ review: isReply ? `@${review.author} ` : '' });
  }

  protected cancelReply(): void {
    this.answering.set(undefined);
    this.replyForm.reset();
  }

  protected submit(): void {
    const answered = this.answering();

    if (!answered || !this.replyForm.valid) {
      return;
    }

    const review = this.replyForm.getRawValue().review.trim();

    if (!review) {
      return;
    }

    this.submitReply.emit({
      review,
      parentReviewId: answered.id,
      threadId: this.thread().root.id,
    });

    this.cancelReply();
  }
}
