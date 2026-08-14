import { TestBed } from '@angular/core/testing';
// The service under test is the one thing allowed to inject the controller, so
// its spec has to provide the token. See the rule in `eslint.config.mjs`.
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { ToastController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import {
  TOAST_DURATION_MS,
  TOAST_FAILURE_DURATION_MS,
  ToastService,
} from '../toast.service';

interface ToastStub {
  present: jest.Mock;
  dismiss: jest.Mock;
  onDidDismiss: jest.Mock;
}

const createToastStub = (): ToastStub => ({
  present: jest.fn().mockResolvedValue(undefined),
  dismiss: jest.fn().mockResolvedValue(undefined),
  onDidDismiss: jest.fn().mockReturnValue(new Promise<void>(() => undefined)),
});

describe('ToastService', () => {
  let service: ToastService;
  let toast: ToastStub;
  let create: jest.Mock;

  beforeEach(() => {
    toast = createToastStub();
    create = jest.fn().mockResolvedValue(toast);

    TestBed.configureTestingModule({
      providers: [
        { provide: ToastController, useValue: { create } },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string): string => `translated:${key}` },
        },
      ],
    });

    service = TestBed.inject(ToastService);
  });

  it('translates the message key and presents the toast', async () => {
    await service.present({
      messageKey: 'preferences-saved',
      outcome: 'success',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'translated:preferences-saved' }),
    );
    expect(toast.present).toHaveBeenCalled();
  });

  it('passes already-resolved text through untranslated', async () => {
    await service.present({
      message: 'Network request failed',
      outcome: 'failure',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Network request failed' }),
    );
  });

  // The defect this service exists for: outside the two Bite paths no toast
  // passed a colour, so a failure was indistinguishable from a success without
  // reading the text (issue #1305).
  it('colours a success and a failure differently', async () => {
    await service.present({
      messageKey: 'preferences-saved',
      outcome: 'success',
    });
    await service.present({
      messageKey: 'notifications-change-failed',
      outcome: 'failure',
    });

    expect(create.mock.calls[0][0].color).toBe('success');
    expect(create.mock.calls[1][0].color).toBe('danger');
  });

  it('uses one position for every toast', async () => {
    await service.present({
      messageKey: 'preferences-saved',
      outcome: 'success',
    });
    await service.present({
      messageKey: 'notifications-change-failed',
      outcome: 'failure',
    });

    expect(create.mock.calls[0][0].position).toBe('top');
    expect(create.mock.calls[1][0].position).toBe('top');
  });

  it('keeps a failure on screen longer than a success', async () => {
    await service.present({
      messageKey: 'preferences-saved',
      outcome: 'success',
    });
    await service.present({
      messageKey: 'notifications-change-failed',
      outcome: 'failure',
    });

    expect(create.mock.calls[0][0].duration).toBe(TOAST_DURATION_MS);
    expect(create.mock.calls[1][0].duration).toBe(TOAST_FAILURE_DURATION_MS);
    expect(TOAST_FAILURE_DURATION_MS).toBeGreaterThan(TOAST_DURATION_MS);
  });

  it('offers a dismiss button when the toast leads nowhere', async () => {
    await service.present({
      messageKey: 'preferences-saved',
      outcome: 'success',
    });

    expect(create.mock.calls[0][0].buttons).toEqual([
      { text: 'translated:ok', role: 'confirm' },
    ]);
  });

  it('replaces the dismiss button with the action the toast offers', async () => {
    const handler = jest.fn();

    await service.present({
      messageKey: 'bitetrail-saved-as-bucket-list',
      outcome: 'success',
      action: { labelKey: 'go-to-bucket-lists', handler },
    });

    const [button] = create.mock.calls[0][0].buttons;
    expect(button.text).toBe('translated:go-to-bucket-lists');
    button.handler();
    expect(handler).toHaveBeenCalled();
  });

  // Ionic stacks toasts at the same position, so without this the second one
  // covers the first and the user reads whichever happens to be on top.
  it('dismisses a toast still on screen before presenting the next', async () => {
    await service.present({
      messageKey: 'preferences-saved',
      outcome: 'success',
    });

    const second = createToastStub();
    create.mockResolvedValue(second);

    await service.present({
      messageKey: 'notifications-change-failed',
      outcome: 'failure',
    });

    expect(toast.dismiss).toHaveBeenCalled();
    expect(second.present).toHaveBeenCalled();
  });

  it('does not dismiss a toast that already auto-dismissed', async () => {
    let dismissed = (): void => undefined;
    toast.onDidDismiss.mockReturnValue(
      new Promise<void>((resolve) => {
        dismissed = (): void => resolve();
      }),
    );

    await service.present({
      messageKey: 'preferences-saved',
      outcome: 'success',
    });

    dismissed();
    await Promise.resolve();

    create.mockResolvedValue(createToastStub());
    await service.present({
      messageKey: 'notifications-change-failed',
      outcome: 'failure',
    });

    expect(toast.dismiss).not.toHaveBeenCalled();
  });

  // In the standalone build `create()` resolves never rather than rejecting
  // when the custom element was not defined, which silently blocked
  // registration for a whole release (issue #1219).
  it('gives up on a controller that never settles instead of hanging', async () => {
    jest.useFakeTimers();
    create.mockReturnValue(new Promise<never>(() => undefined));

    const presented = service.present({
      messageKey: 'preferences-saved',
      outcome: 'success',
    });

    // Async, because the timer is only registered once `present` has yielded.
    await jest.advanceTimersByTimeAsync(2_000);

    await expect(presented).resolves.toBeUndefined();

    jest.useRealTimers();
  });

  it('resolves quietly when the controller rejects', async () => {
    create.mockRejectedValue(new Error('no overlay'));

    await expect(
      service.present({ messageKey: 'preferences-saved', outcome: 'success' }),
    ).resolves.toBeUndefined();
  });
});
