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
import { ReportedUser } from 'model';
import { ProfileReportsComponent } from '../profile-reports.component';

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

const reported = (over: Partial<ReportedUser> = {}): ReportedUser => ({
  uid: 'u1',
  exists: true,
  displayName: 'troll',
  photoUrl: 'https://example.test/face.jpg',
  about: 'About me',
  blocked: false,
  recentBites: [
    { biteId: 'b1', name: 'Ramen', imageSrc: 'https://example.test/b1.jpg' },
  ],
  reportCount: 3,
  reasons: {
    harassment: 2,
    impersonation: 1,
    spam: 0,
    inappropriate: 0,
    other: 0,
  },
  firstReportedAt: '2026-10-01T10:00:00.000Z',
  lastReportedAt: '2026-10-02T10:00:00.000Z',
  ...over,
});

/** GitHub issue #1829. */
describe(ProfileReportsComponent.name, () => {
  let component: ProfileReportsComponent;
  let fixture: ComponentFixture<ProfileReportsComponent>;
  let ref: ComponentRef<ProfileReportsComponent>;
  let alertController: AlertController;

  const setInputs = (inputs: Record<string, unknown>): void => {
    Object.entries(inputs).forEach(([key, value]) => ref.setInput(key, value));
    fixture.detectChanges();
  };

  const element = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const disabled = (testId: string): boolean =>
    (element(testId) as HTMLIonButtonElement | null)?.disabled ?? false;

  /** Presents the confirmation and returns its confirming button's handler. */
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
      .overrideComponent(ProfileReportsComponent, {
        remove: { imports: [TranslocoPipe] },
        add: { imports: [MockTranslocoPipe] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProfileReportsComponent);
    component = fixture.componentInstance;
    ref = fixture.componentRef;
    alertController = TestBed.inject(AlertController);
    fixture.detectChanges();
  });

  it('lists the reported profiles with their report counts', () => {
    setInputs({ loaded: true, reports: [reported()] });

    const list = element('admin-profile-reports-list')?.textContent ?? '';
    expect(list).toContain('troll');
    expect(list).toContain('3');
  });

  it('says the queue is empty only once it has loaded', () => {
    expect(element('admin-profile-reports-empty')).toBeNull();

    setInputs({ loaded: true });

    expect(element('admin-profile-reports-empty')).not.toBeNull();
  });

  it('says the queue failed rather than that it is empty', () => {
    setInputs({ loaded: true, failed: true });

    expect(element('admin-profile-reports-failed')).not.toBeNull();
    expect(element('admin-profile-reports-empty')).toBeNull();
  });

  it('shows the photo, the display name and the recent Bites', () => {
    setInputs({ reports: [reported()], selected: reported() });

    expect(element('admin-profile-reports-photo')?.getAttribute('src')).toBe(
      'https://example.test/face.jpg',
    );
    expect(element('admin-profile-reports-detail')?.textContent).toContain(
      'troll',
    );
    expect(element('admin-profile-reports-bites')?.textContent).toContain(
      'Ramen',
    );
  });

  it('shows the reasons most frequent first, leaving out the unused ones', () => {
    setInputs({ selected: reported() });

    expect(component.reasonCounts()).toEqual([
      { reason: 'harassment', count: 2 },
      { reason: 'impersonation', count: 1 },
    ]);
  });

  it('blocks the account once confirmed', async () => {
    setInputs({ selected: reported() });
    const emit = jest.spyOn(component.blockAccount, 'emit');

    const confirm = await confirmHandler(() => component.onBlockAccount());
    expect(emit).not.toHaveBeenCalled();
    confirm?.(undefined);

    expect(emit).toHaveBeenCalledWith('u1');
  });

  it('does not offer the block while another answer is running', () => {
    setInputs({ selected: reported(), action: 'dismiss' });

    expect(component.canBlock()).toBe(false);
  });

  it('does not offer the block for an account already blocked', () => {
    setInputs({ selected: reported({ blocked: true }) });

    expect(component.canBlock()).toBe(false);
    expect(disabled('admin-profile-reports-block')).toBe(true);
  });

  it('holds the closing until a reason is given, then closes with it', async () => {
    setInputs({ selected: reported() });
    expect(disabled('admin-profile-reports-dismiss')).toBe(true);

    component.onReasonChange('  Blocked.  ');
    fixture.detectChanges();
    expect(disabled('admin-profile-reports-dismiss')).toBe(false);

    const emit = jest.spyOn(component.dismissReports, 'emit');
    const confirm = await confirmHandler(() => component.onDismiss());
    confirm?.(undefined);

    expect(emit).toHaveBeenCalledWith({ uid: 'u1', reason: 'Blocked.' });
    expect(component.reason()).toBe('');
  });

  it('offers only closing for a profile that no longer exists', () => {
    const gone = reported({ exists: false, displayName: '' });
    setInputs({ reports: [gone], selected: gone });

    expect(element('admin-profile-reports-gone')).not.toBeNull();
    expect(element('admin-profile-reports-block')).toBeNull();
    expect(element('admin-profile-reports-dismiss')).not.toBeNull();
  });

  it('clears the reason when another profile is selected', () => {
    component.onReasonChange('Fine');

    component.onSelect(reported({ uid: 'u2' }));

    expect(component.reason()).toBe('');
  });

  describe('guards', () => {
    let create: jest.SpyInstance;

    beforeEach(() => {
      create = jest.spyOn(alertController, 'create');
    });

    it('asks nothing without a selection', async () => {
      await component.onDismiss();
      await component.onBlockAccount();

      expect(component.canBlock()).toBe(false);
      expect(component.reasonCounts()).toEqual([]);
      expect(create).not.toHaveBeenCalled();
    });

    it('treats a reason missing from the counts as none', () => {
      setInputs({
        selected: reported({
          reasons: { spam: 2 } as ReportedUser['reasons'],
        }),
      });

      expect(component.reasonCounts()).toEqual([{ reason: 'spam', count: 2 }]);
    });

    it('asks nothing for a closing without a reason', async () => {
      setInputs({ selected: reported() });

      await component.onDismiss();

      expect(create).not.toHaveBeenCalled();
    });

    it('names the account by its uid when it has no display name', async () => {
      setInputs({ selected: reported({ displayName: '' }) });
      const alert = document.createElement('ion-alert');
      jest.spyOn(alert, 'present').mockResolvedValue();
      create.mockResolvedValue(alert);

      await component.onBlockAccount();

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ subHeader: 'u1' }),
      );
    });
  });
});
