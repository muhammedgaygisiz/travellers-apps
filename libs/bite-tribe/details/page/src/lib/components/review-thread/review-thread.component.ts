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
import { NgTemplateOutlet } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
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

/** What the page needs to write the new text of the user's own review. */
export interface ReviewEditSubmit {
  reviewId: string;
  review: string;
}

/**
 * The user asked to withdraw their own review or reply (issue #2116). The page
 * asks for confirmation before anything is written, so it needs to know which
 * of the two to name.
 */
export interface ReviewDeleteRequest {
  reviewId: string;
  isReply: boolean;
}

/**
 * The reader asked to report somebody else's review or reply (issue #2117).
 * The page asks why before anything is sent, and names which of the two.
 */
export interface ReviewReportRequest {
  reviewId: string;
  isReply: boolean;
}

/**
 * Whitespace is not a review. The rules refuse it too, so letting it through
 * here would only trade a disabled button for a failed save (issue #721).
 */
const notBlank = (control: AbstractControl<string>): ValidationErrors | null =>
  control.value.trim() ? null : { blank: true };

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
    NgTemplateOutlet,
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
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

  /**
   * The signed-in user, so their own reviews and replies offer an edit. Absent
   * while signed out, which offers none.
   */
  userId = input<string>();

  /** Set when a tapped reply notification pointed at this thread. */
  highlighted = input(false, { transform: booleanAttribute });

  /** The language the timestamps are worded in. */
  activeLang = input('en');

  submitReply = output<ReviewReplySubmit>();

  submitEdit = output<ReviewEditSubmit>();

  deleteReview = output<ReviewDeleteRequest>();

  reportReview = output<ReviewReportRequest>();

  private readonly formBuilder = inject(FormBuilder);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly replyForm = this.formBuilder.nonNullable.group({
    review: ['', Validators.required],
  });

  protected readonly editForm = this.formBuilder.nonNullable.group({
    review: ['', [Validators.required, notBlank]],
  });

  /** The review being edited in place, or nothing while none is. */
  private readonly editing = signal<Review | undefined>(undefined);

  protected readonly editingId = computed(() => this.editing()?.id);

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

  /**
   * Only the author edits, and only a review that names one: a review written
   * before `authorId` was stored belongs to nobody the app can identify.
   */
  protected canEdit(review: Review): boolean {
    const userId = this.userId();

    return !!userId && review.authorId === userId && !this.isDeleted(review);
  }

  /**
   * A withdrawn review that still holds up somebody's reply (issue #2116). It
   * keeps its place and shows only that it was deleted: no name, no age, and
   * nothing to answer, edit or delete.
   */
  protected isDeleted(review: Review): boolean {
    return !!review.deletedAt;
  }

  /**
   * Report is offered on every item the signed-in member did not write
   * (issue #2117): the same reader `canReply` admits, never on their own item
   * and never on a tombstone, which has no text left to object to.
   * `reportReview` refuses both regardless.
   */
  protected canReport(review: Review): boolean {
    const userId = this.userId();

    return (
      this.canReply() &&
      !!userId &&
      review.authorId !== userId &&
      !this.isDeleted(review)
    );
  }

  /** Closes any open editor or composer first, as {@link requestDelete} does. */
  protected requestReport(review: Review): void {
    this.cancelEdit();
    this.cancelReply();
    this.reportReview.emit({
      reviewId: review.id,
      isReply: !!review.parentReviewId,
    });
  }

  protected canAnswer(review: Review): boolean {
    return this.canReply() && !this.isDeleted(review);
  }

  /**
   * Asks the page to withdraw the review. Any editor or composer open in the
   * thread closes first, so nothing is left pointing at an item that may be
   * about to disappear.
   */
  protected requestDelete(review: Review): void {
    this.cancelEdit();
    this.cancelReply();
    this.deleteReview.emit({
      reviewId: review.id,
      isReply: !!review.parentReviewId,
    });
  }

  /**
   * Swaps the text for an editor holding it. One editor at a time across the
   * thread, and never next to an open reply composer, so Save always means one
   * thing.
   */
  protected startEdit(review: Review): void {
    this.cancelReply();
    this.editing.set(review);
    this.editForm.reset({ review: review.review });
  }

  protected cancelEdit(): void {
    this.editing.set(undefined);
    this.editForm.reset();
  }

  /**
   * Hands the new text to the page and closes the editor. The thread keeps
   * rendering the stored text until the reloaded review arrives, so a failed
   * save leaves the original in place rather than the draft.
   */
  protected saveEdit(): void {
    const edited = this.editing();

    if (!edited || !this.editForm.valid) {
      return;
    }

    const review = this.editForm.getRawValue().review.trim();

    if (review !== edited.review) {
      this.submitEdit.emit({ reviewId: edited.id, review });
    }

    this.cancelEdit();
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

    this.cancelEdit();
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
