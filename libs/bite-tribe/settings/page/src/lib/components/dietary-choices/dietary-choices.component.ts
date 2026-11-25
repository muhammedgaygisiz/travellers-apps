import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  IonAlert,
  IonButton,
  IonNote,
  type AlertButton,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ChipComponent } from 'common/ui/chip';
import {
  DIETARY_CHOICES,
  isDietaryLabel,
  isSensitiveDietaryChoice,
  LIFESTYLE_DIETARY_CHOICES,
  SENSITIVE_DIETARY_CHOICES,
  type DietaryChoice,
} from 'model';

/**
 * A change the member made to their dietary choices. `consent` is whether
 * religion and health choices may be stored once it is written: given, kept,
 * or withdrawn.
 */
export interface DietaryChoicesChange {
  choices: DietaryChoice[];
  consent: boolean;
}

const AGREE = 'agree';
const WITHDRAW = 'withdraw';

/**
 * The dietary choices section of settings (GitHub issue #2196).
 *
 * One chip per choice, in two groups: lifestyle choices, which are stored as
 * soon as they are tapped, and religion and health choices, which are not
 * stored until the member has agreed to it (`R-10`). Withdrawing the consent
 * removes those choices in the same change. Every change applies at once,
 * like the haptics switch, rather than waiting for the preferences form's
 * save, so a consent is never given for a choice that is then not saved.
 */
@Component({
  selector: 'bt-dietary-choices',
  templateUrl: './dietary-choices.component.html',
  styleUrl: './dietary-choices.component.scss',
  imports: [IonAlert, IonButton, IonNote, TranslocoPipe, ChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DietaryChoicesComponent {
  private readonly transloco = inject(TranslocoService);

  /** The stored choices, already read through `dietaryChoicesOf`. */
  choices = input<readonly DietaryChoice[]>([]);
  /** Whether the member has consented to religion and health choices. */
  consentGiven = input(false);

  choicesChange = output<DietaryChoicesChange>();

  readonly lifestyleChoices = LIFESTYLE_DIETARY_CHOICES;
  readonly sensitiveChoices = SENSITIVE_DIETARY_CHOICES;

  /** The sensitive choice waiting for the member's answer to the consent. */
  readonly pendingChoice = signal<DietaryChoice | undefined>(undefined);
  readonly confirmingWithdrawal = signal(false);

  readonly hasChoices = computed(() => this.choices().length > 0);

  /**
   * The dialogs' buttons, translated when a dialog opens rather than when the
   * component is built: settings can be built before the language's file has
   * arrived, and a synchronous translation then returns the bare key.
   */
  readonly consentButtons = signal<AlertButton[]>([]);
  readonly withdrawButtons = signal<AlertButton[]>([]);

  isSelected(choice: DietaryChoice): boolean {
    return this.choices().includes(choice);
  }

  toggle(choice: DietaryChoice): void {
    if (this.isSelected(choice)) {
      this.emit(
        this.choices().filter((picked) => picked !== choice),
        this.consentGiven(),
      );

      return;
    }

    // Nothing is written before the member agrees, not even the choice that
    // asked for the consent.
    if (isSensitiveDietaryChoice(choice) && !this.consentGiven()) {
      this.consentButtons.set(
        this.buttons('dietary-choices-consent-accept', AGREE),
      );
      this.pendingChoice.set(choice);

      return;
    }

    this.emit([...this.choices(), choice], this.consentGiven());
  }

  onConsentDismiss(event: { detail: { role?: string } }): void {
    const choice = this.pendingChoice();
    this.pendingChoice.set(undefined);

    if (choice && event?.detail?.role === AGREE) {
      this.emit([...this.choices(), choice], true);
    }
  }

  withdrawConsent(): void {
    this.withdrawButtons.set(
      this.buttons('dietary-choices-withdraw-confirm', WITHDRAW),
    );
    this.confirmingWithdrawal.set(true);
  }

  onWithdrawDismiss(event: { detail: { role?: string } }): void {
    this.confirmingWithdrawal.set(false);

    if (event?.detail?.role === WITHDRAW) {
      this.emit(
        this.choices().filter((choice) => !isSensitiveDietaryChoice(choice)),
        false,
      );
    }
  }

  /** Clears the choices and keeps the consent, which is a separate decision. */
  clear(): void {
    this.emit([], this.consentGiven());
  }

  private buttons(confirmKey: string, role: string): AlertButton[] {
    return [
      { text: this.transloco.translate('cancel'), role: 'cancel' },
      { text: this.transloco.translate(confirmKey), role },
    ];
  }

  private emit(choices: readonly DietaryChoice[], consent: boolean): void {
    // In list order, so the stored list reads the same however it was built.
    this.choicesChange.emit({
      choices: DIETARY_CHOICES.filter((choice) => choices.includes(choice)),
      consent,
    });
  }

  labelKey(choice: DietaryChoice): string {
    // A label keeps the name it has on a dish, so the two never read apart.
    return isDietaryLabel(choice)
      ? `dietary-label-${choice}`
      : `dietary-choice-${choice}`;
  }
}
