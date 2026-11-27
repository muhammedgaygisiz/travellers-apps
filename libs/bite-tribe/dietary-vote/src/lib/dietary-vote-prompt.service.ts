import { inject, Injectable } from '@angular/core';
import {
  ActionSheetController,
  AlertController,
} from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import {
  DIETARY_DISPUTE_REASONS,
  MAX_DIETARY_VOTE_NOTE_LENGTH,
  type DietaryDisputeReason,
  type DietaryLabel,
  type DietaryVote,
  type VoteDietaryLabelResult,
} from 'model';
import { ToastService } from 'toast';

/** What the diner chose: a vote, and for a dispute why and an optional note. */
export interface DietaryVoteChoice {
  vote: DietaryVote;
  reason?: DietaryDisputeReason;
  note?: string;
}

/**
 * The message a vote's outcome is told with. An ineligible account is told
 * why (`UC - Find Dishes That Fit A Dietary Choice` `R-5`), and a refused note
 * is told apart from a failed call, which is worth trying again.
 */
export const dietaryVoteOutcomeKey = (
  result: VoteDietaryLabelResult | undefined,
): string => {
  switch (result?.status) {
    case 'saved':
      return 'dietary-vote-saved';
    case 'ineligible':
      return `dietary-vote-ineligible-${result.reason}`;
    case 'refused':
      return 'dietary-vote-note-refused';
    default:
      return 'dietary-vote-failed';
  }
};

/**
 * Confirming or disputing one dietary label (GitHub issue #2197), the same on
 * the Bite details page and on the menu.
 *
 * It asks and it tells; the vote itself is the caller's `send`, so this
 * library holds no data and reaches no backend.
 */
@Injectable({ providedIn: 'root' })
export class DietaryVotePromptService {
  private readonly actionSheets = inject(ActionSheetController);
  private readonly alerts = inject(AlertController);
  private readonly transloco = inject(TranslocoService);
  private readonly toast = inject(ToastService);

  /**
   * Asks, sends and says what came of it. Answers the result, or nothing
   * when the diner cancelled at any step.
   *
   * A `vote` already chosen - a thumb tapped on the Bite details page - skips
   * the first question: a confirmation is sent as it is, and a dispute still
   * asks why.
   */
  async run(
    label: DietaryLabel,
    ownVote: DietaryVote | undefined,
    send: (choice: DietaryVoteChoice) => Promise<VoteDietaryLabelResult>,
    vote?: DietaryVote,
  ): Promise<VoteDietaryLabelResult | undefined> {
    const choice = await this.ask(label, ownVote, vote);

    if (!choice) {
      return undefined;
    }

    let result: VoteDietaryLabelResult | undefined;

    try {
      result = await send(choice);
    } catch (error) {
      console.error('Failed to vote on the dietary label:', error);
    }

    await this.toast.present({
      messageKey: dietaryVoteOutcomeKey(result),
      outcome: result?.status === 'saved' ? 'success' : 'failure',
    });

    return result;
  }

  /** The questions alone: confirm or dispute, then why, then a note. */
  async ask(
    label: DietaryLabel,
    ownVote: DietaryVote | undefined,
    chosen?: DietaryVote,
  ): Promise<DietaryVoteChoice | undefined> {
    const vote = chosen ?? (await this.pickVote(label, ownVote));

    if (vote !== 'dispute') {
      return vote ? { vote } : undefined;
    }

    const reason = await this.pick<DietaryDisputeReason>(
      this.t('dietary-vote-reason-header'),
      undefined,
      DIETARY_DISPUTE_REASONS.map((value) => [
        value,
        this.t(`dietary-vote-reason-${value}`),
      ]),
    );

    if (!reason) {
      return undefined;
    }

    const note = await this.askNote();

    if (note === undefined) {
      return undefined;
    }

    return { vote, reason, ...(note ? { note } : {}) };
  }

  private pickVote(
    label: DietaryLabel,
    ownVote: DietaryVote | undefined,
  ): Promise<DietaryVote | undefined> {
    return this.pick<DietaryVote>(
      this.t('dietary-vote-header', {
        label: this.t(`dietary-label-${label}`),
      }),
      ownVote ? this.t(`dietary-vote-own-${ownVote}`) : undefined,
      [
        ['confirm', this.t('dietary-vote-confirm')],
        ['dispute', this.t('dietary-vote-dispute')],
      ],
    );
  }

  private async pick<T extends string>(
    header: string,
    subHeader: string | undefined,
    options: [T, string][],
  ): Promise<T | undefined> {
    const sheet = await this.actionSheets.create({
      header,
      ...(subHeader ? { subHeader } : {}),
      buttons: [
        ...options.map(([value, text]) => ({ text, data: value })),
        { text: this.t('cancel'), role: 'cancel' },
      ],
    });

    await sheet.present();

    const { data, role } = await sheet.onDidDismiss<T>();

    return role === 'cancel' || role === 'backdrop' ? undefined : data;
  }

  /** The optional note; `undefined` when cancelled, `''` when left empty. */
  private async askNote(): Promise<string | undefined> {
    const alert = await this.alerts.create({
      header: this.t('dietary-vote-note-header'),
      message: this.t('dietary-vote-note-message'),
      inputs: [
        {
          name: 'note',
          type: 'textarea',
          placeholder: this.t('dietary-vote-note-placeholder'),
          attributes: { maxlength: MAX_DIETARY_VOTE_NOTE_LENGTH },
        },
      ],
      buttons: [
        { text: this.t('cancel'), role: 'cancel' },
        { text: this.t('dietary-vote-send'), role: 'confirm' },
      ],
    });

    await alert.present();

    const { data, role } = await alert.onDidDismiss<{
      values?: { note?: string };
    }>();

    return role === 'confirm' ? (data?.values?.note ?? '').trim() : undefined;
  }

  private t(key: string, params?: Record<string, unknown>): string {
    return this.transloco.translate(key, params);
  }
}
