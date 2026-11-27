import { TestBed } from '@angular/core/testing';
import {
  ActionSheetController,
  AlertController,
} from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { ToastService } from 'toast';
import {
  dietaryVoteOutcomeKey,
  DietaryVotePromptService,
} from '../dietary-vote-prompt.service';

type Dismissal = { data?: unknown; role?: string };

/** See GitHub issue #2197. */
describe(DietaryVotePromptService.name, () => {
  let sheets: Dismissal[];
  let alerts: Dismissal[];
  const sheetOptions: Record<string, unknown>[] = [];
  const toast = { present: jest.fn(async () => undefined) };

  const overlay = (queue: () => Dismissal[], options: unknown[]): jest.Mock =>
    jest.fn(async (created: unknown) => {
      options.push(created);

      return {
        present: async (): Promise<void> => undefined,
        onDidDismiss: async (): Promise<Dismissal> =>
          queue().shift() ?? { role: 'cancel' },
      };
    });

  let service: DietaryVotePromptService;

  beforeEach(() => {
    sheets = [];
    alerts = [];
    sheetOptions.length = 0;
    toast.present.mockClear();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActionSheetController,
          useValue: { create: overlay(() => sheets, sheetOptions) },
        },
        {
          provide: AlertController,
          useValue: { create: overlay(() => alerts, []) },
        },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string): string => key },
        },
        { provide: ToastService, useValue: toast },
      ],
    });

    service = TestBed.inject(DietaryVotePromptService);
  });

  it('sends a confirmation straight away and says it counted', async () => {
    sheets.push({ data: 'confirm' });
    const send = jest.fn(async () => ({
      status: 'saved' as const,
      tally: { confirm: 1, dispute: 0 },
    }));

    await expect(service.run('vegan', undefined, send)).resolves.toEqual({
      status: 'saved',
      tally: { confirm: 1, dispute: 0 },
    });

    expect(send).toHaveBeenCalledWith({ vote: 'confirm' });
    expect(toast.present).toHaveBeenCalledWith({
      messageKey: 'dietary-vote-saved',
      outcome: 'success',
    });
  });

  it('asks a dispute for its reason and an optional, trimmed note', async () => {
    sheets.push({ data: 'dispute' }, { data: 'got-sick' });
    alerts.push({
      role: 'confirm',
      data: { values: { note: '  Ill after. ' } },
    });

    await expect(service.ask('gluten-free', 'confirm')).resolves.toEqual({
      vote: 'dispute',
      reason: 'got-sick',
      note: 'Ill after.',
    });
    // The diner is reminded of the vote they are replacing.
    expect(sheetOptions[0]).toMatchObject({
      subHeader: 'dietary-vote-own-confirm',
    });
  });

  it('leaves out an empty note', async () => {
    sheets.push({ data: 'dispute' }, { data: 'other' });
    alerts.push({ role: 'confirm', data: { values: { note: '   ' } } });

    await expect(service.ask('vegan', undefined)).resolves.toEqual({
      vote: 'dispute',
      reason: 'other',
    });
  });

  it.each([
    [[{ role: 'cancel' }], []],
    [[{ role: 'backdrop' }], []],
    [[{ data: 'dispute' }, { role: 'cancel' }], []],
    [[{ data: 'dispute' }, { data: 'gluten' }], [{ role: 'cancel' }]],
  ])(
    'sends nothing when any step is cancelled',
    async (sheetSteps, alertSteps) => {
      sheets.push(...sheetSteps);
      alerts.push(...alertSteps);
      const send = jest.fn();

      await expect(
        service.run('vegan', undefined, send),
      ).resolves.toBeUndefined();
      expect(send).not.toHaveBeenCalled();
      expect(toast.present).not.toHaveBeenCalled();
    },
  );

  it('says why an ineligible account was refused, and that a failed call failed', async () => {
    sheets.push({ data: 'confirm' }, { data: 'confirm' });

    await service.run('vegan', undefined, async () => ({
      status: 'ineligible',
      reason: 'account-too-new',
    }));
    await service.run('vegan', undefined, async () => {
      throw new Error('offline');
    });

    expect(toast.present).toHaveBeenNthCalledWith(1, {
      messageKey: 'dietary-vote-ineligible-account-too-new',
      outcome: 'failure',
    });
    expect(toast.present).toHaveBeenNthCalledWith(2, {
      messageKey: 'dietary-vote-failed',
      outcome: 'failure',
    });
  });

  it.each([
    [
      { status: 'saved', tally: { confirm: 1, dispute: 0 } },
      'dietary-vote-saved',
    ],
    [
      { status: 'ineligible', reason: 'own-bite' },
      'dietary-vote-ineligible-own-bite',
    ],
    [{ status: 'refused', field: 'note' }, 'dietary-vote-note-refused'],
    [undefined, 'dietary-vote-failed'],
  ] as const)('tells %j as %s', (result, key) => {
    expect(dietaryVoteOutcomeKey(result)).toBe(key);
  });
});
