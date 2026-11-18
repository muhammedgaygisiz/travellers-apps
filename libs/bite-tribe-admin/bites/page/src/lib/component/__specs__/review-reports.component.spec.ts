import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, Pipe, PipeTransform } from '@angular/core';
import {
  AlertButton,
  AlertController,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { ReportedReview } from 'model';
import { ReviewReportsComponent } from '../review-reports.component';

@Pipe({ name: 'transloco' })
class MockTranslocoPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

const reported = (over: Partial<ReportedReview> = {}): ReportedReview => ({
  reviewId: 'reply-1',
  exists: true,
  text: 'Nobody asked you.',
  authorUid: 'u1',
  authorDisplayName: 'troll',
  biteId: 'b1',
  biteName: 'Ramen',
  parent: {
    reviewId: 'review-1',
    text: 'Great broth.',
    authorDisplayName: 'Mira',
  },
  reportCount: 3,
  reasons: { harassment: 2, hate: 1, spam: 0, inappropriate: 0, other: 0 },
  firstReportedAt: '2026-11-01T10:00:00.000Z',
  lastReportedAt: '2026-11-02T10:00:00.000Z',
  ...over,
});

/** GitHub issue #2117. */
describe(ReviewReportsComponent.name, () => {
  let component: ReviewReportsComponent;
  let fixture: ComponentFixture<ReviewReportsComponent>;
  let ref: ComponentRef<ReviewReportsComponent>;
  let alertController: AlertController;

  const setInputs = (inputs: Record<string, unknown>): void => {
    Object.entries(inputs).forEach(([key, value]) => ref.setInput(key, value));
    fixture.detectChanges();
  };

  const element = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const disabled = (testId: string): boolean =>
    (element(testId) as HTMLIonButtonElement | null)?.disabled ?? false;

  const confirmHandler = async (
    act: () => Promise<void>,
  ): Promise<AlertButton['handler']> => {
    let buttons: AlertButton[] = [];
    const alert = document.createElement('ion-alert');
    jest.spyOn(alert, 'present').mockResolvedValue();
    jest.spyOn(alertController, 'create').mockImplementation((options) => {
      buttons = (options?.buttons ?? []).filter(
        (button): button is AlertButton => typeof button !== 'string',
      );
      return Promise.resolve(alert);
    });

    await act();

    return buttons.find((button) => button.role === 'destructive')?.handler;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    })
      .overrideComponent(ReviewReportsComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ReviewReportsComponent);
    component = fixture.componentInstance;
    ref = fixture.componentRef;
    alertController = TestBed.inject(AlertController);
    fixture.detectChanges();
  });

  it('lists the reported items with their authors and counts', () => {
    setInputs({ loaded: true, reports: [reported()] });

    const list = element('admin-review-reports-list')?.textContent ?? '';
    expect(list).toContain('troll');
    expect(list).toContain('Nobody asked you.');
    expect(list).toContain('3');
  });

  it('says the queue is empty only once it has loaded', () => {
    expect(element('admin-review-reports-empty')).toBeNull();

    setInputs({ loaded: true });

    expect(element('admin-review-reports-empty')).not.toBeNull();
  });

  it('says the queue failed rather than that it is empty', () => {
    setInputs({ loaded: true, failed: true });

    expect(element('admin-review-reports-failed')).not.toBeNull();
    expect(element('admin-review-reports-empty')).toBeNull();
  });

  it('shows a reply under the item it answers', () => {
    setInputs({ reports: [reported()], selected: reported() });

    expect(element('admin-review-reports-parent')?.textContent).toContain(
      'Great broth.',
    );
    expect(element('admin-review-reports-text')?.textContent).toContain(
      'Nobody asked you.',
    );
  });

  it('shows a top-level review without a parent', () => {
    const review = reported({ parent: undefined });
    setInputs({ reports: [review], selected: review });

    expect(element('admin-review-reports-parent')).toBeNull();
  });

  it('lists the reasons given, most frequent first', () => {
    setInputs({ reports: [reported()], selected: reported() });

    expect(component.reasonCounts()).toEqual([
      { reason: 'harassment', count: 2 },
      { reason: 'hate', count: 1 },
    ]);
  });

  it('blocks the author only once confirmed', async () => {
    setInputs({ reports: [reported()], selected: reported() });
    const emit = jest.spyOn(component.blockAuthor, 'emit');

    const confirm = await confirmHandler(() => component.onBlockAuthor());

    expect(emit).not.toHaveBeenCalled();
    confirm?.(undefined);
    expect(emit).toHaveBeenCalledWith('u1');
  });

  it('offers no block once the author was blocked from here', () => {
    setInputs({
      reports: [reported()],
      selected: reported(),
      blockedAuthors: new Set(['u1']),
    });

    expect(disabled('admin-review-reports-block')).toBe(true);
  });

  it('offers no block on a review that is gone', () => {
    const gone = reported({ exists: false, text: '', authorUid: '' });
    setInputs({ reports: [gone], selected: gone });

    expect(element('admin-review-reports-block')).toBeNull();
    expect(element('admin-review-reports-gone')).not.toBeNull();
  });

  it('keeps a review only with a reason, and only once confirmed', async () => {
    setInputs({ reports: [reported()], selected: reported() });
    const emit = jest.spyOn(component.dismissReports, 'emit');

    expect(disabled('admin-review-reports-dismiss')).toBe(true);

    component.onReasonChange('  Banter between friends.  ');
    fixture.detectChanges();
    expect(disabled('admin-review-reports-dismiss')).toBe(false);

    const confirm = await confirmHandler(() => component.onDismiss());
    expect(emit).not.toHaveBeenCalled();

    confirm?.(undefined);
    expect(emit).toHaveBeenCalledWith({
      reviewId: 'reply-1',
      reason: 'Banter between friends.',
    });
    expect(component.reason()).toBe('');
  });

  it('clears the reason when another review is selected', () => {
    component.onReasonChange('typed for the first one');

    component.onSelect(reported({ reviewId: 'reply-2' }));

    expect(component.reason()).toBe('');
  });

  it('counts no reasons while nothing is selected', () => {
    expect(component.reasonCounts()).toEqual([]);
  });

  it('counts a reason the listing left out as none', () => {
    const review = reported({
      reasons: { harassment: 1 } as ReportedReview['reasons'],
    });
    setInputs({ reports: [review], selected: review });

    expect(component.reasonCounts()).toEqual([
      { reason: 'harassment', count: 1 },
    ]);
  });

  it('names an author without a display name by their uid', () => {
    expect(component.authorOf(reported({ authorDisplayName: '' }))).toBe('u1');
  });

  it('asks nothing when blocking without a selection', async () => {
    const create = jest.spyOn(alertController, 'create');

    await component.onBlockAuthor();

    expect(create).not.toHaveBeenCalled();
  });

  it('asks nothing when the author was already blocked', async () => {
    setInputs({
      reports: [reported()],
      selected: reported(),
      blockedAuthors: new Set(['u1']),
    });
    const create = jest.spyOn(alertController, 'create');

    await component.onBlockAuthor();

    expect(create).not.toHaveBeenCalled();
  });

  it('offers no block on a review whose author deleted their account', () => {
    const orphan = reported({ authorUid: '', authorDisplayName: '' });
    setInputs({ reports: [orphan], selected: orphan });

    expect(component.canBlock()).toBe(false);
    expect(element('admin-review-reports-block')).toBeNull();
  });

  it('asks nothing when keeping without a reason', async () => {
    setInputs({ reports: [reported()], selected: reported() });
    const create = jest.spyOn(alertController, 'create');

    await component.onDismiss();

    expect(create).not.toHaveBeenCalled();
  });

  it('asks nothing when keeping without a selection', async () => {
    component.onReasonChange('Fine');
    const create = jest.spyOn(alertController, 'create');

    await component.onDismiss();

    expect(create).not.toHaveBeenCalled();
  });

  it('offers no block while nothing is selected', () => {
    expect(component.authorBlocked()).toBe(false);
    expect(component.canBlock()).toBe(false);
  });

  it('offers no block while another action is under way', () => {
    setInputs({
      reports: [reported()],
      selected: reported(),
      action: 'dismiss',
    });

    expect(component.canBlock()).toBe(false);
  });
});
