import {
  applicationConfig,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonItem,
  IonLabel,
  IonList,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { PRESS_FEEDBACK_ROOT_CLASS, PRESSED_CLASS } from '../press-feedback';

/**
 * The pressed state of every kind of pressable surface (issue #1745).
 *
 * In the app the class comes from the delegated listener, set and cleared by
 * the finger. Here it is written into the template, which is the only way to
 * hold a press still long enough to look at it.
 *
 * The listener also puts the opt-in class on the document; a story puts it on
 * its own wrapper instead, because Loki moves from story to story without
 * reloading and a class left on the document would reach every later story.
 */

/**
 * The bite-tribe dark palette, on the wrapper rather than `html.dark` - see
 * `A Dark Story Cannot Switch The Document` in Implementation - Storybook.
 * These are the variables the surfaces below draw their colours from.
 */
const DARK = [
  '--ion-background-color: #1a1c22',
  '--ion-background-color-rgb: 19, 22, 32',
  '--ion-text-color: #fff',
  '--ion-text-color-rgb: 255, 255, 255',
  '--ion-color-primary-contrast: #263341',
].join('; ');

/**
 * The one rule of the dark theme that is not a variable: `html.dark` gives a
 * clear button the dark secondary colour, without which its label is dark on
 * dark.
 */
const DARK_RULES = '.story-dark .button-clear { --color: #fcf7f0; }';

/**
 * What `prefers-reduced-motion: reduce` switches. A story cannot set the media
 * query, so it sets what the query sets.
 */
const REDUCED_MOTION = '--bt-press-scale: 1; --bt-release-easing: ease-out';

interface Variant {
  readonly pressed?: boolean;
  readonly disabled?: boolean;
  readonly dark?: boolean;
  readonly reducedMotion?: boolean;
}

const surfaces = ({ pressed, disabled }: Variant): string => {
  const state = pressed ? `class="${PRESSED_CLASS}"` : '';
  const off = disabled ? 'disabled' : '';

  return `
    <div class="surfaces">
      <ion-button fill="solid" ${state} ${off}>Solid</ion-button>
      <ion-button fill="outline" ${state} ${off}>Outline</ion-button>
      <ion-button fill="clear" ${state} ${off}>Clear</ion-button>
      <ion-chip ${state} ${off ? 'disabled="true"' : ''}>Chip</ion-chip>
    </div>
    <ion-list>
      <ion-item [button]="true" ${state} ${off}>
        <ion-label>A list row</ion-label>
      </ion-item>
    </ion-list>
    <ion-card btPressable ${state} ${off ? 'aria-disabled="true"' : ''}>
      <ion-card-header>
        <ion-card-title>A tappable card</ion-card-title>
      </ion-card-header>
      <ion-card-content>Cards opt in with btPressable.</ion-card-content>
    </ion-card>
  `;
};

const render =
  (variant: Variant): StoryObj['render'] =>
  () => {
    const style = [
      variant.dark ? DARK : '',
      variant.reducedMotion ? REDUCED_MOTION : '',
      'background: var(--ion-background-color, #fff)',
      'color: var(--ion-text-color, #000)',
      'padding: 16px',
      'min-height: 100vh',
    ]
      .filter(Boolean)
      .join('; ');

    return {
      template: `
        <style>
          .surfaces { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
          ${DARK_RULES}
        </style>
        <div
          class="${PRESS_FEEDBACK_ROOT_CLASS} ${variant.dark ? 'story-dark' : ''}"
          style="${style}"
        >
          ${surfaces(variant)}
        </div>
      `,
    };
  };

export default {
  title: 'Components/Pressed State',
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
    moduleMetadata({
      imports: [
        IonButton,
        IonCard,
        IonCardContent,
        IonCardHeader,
        IonCardTitle,
        IonChip,
        IonItem,
        IonLabel,
        IonList,
      ],
    }),
  ],
} as Meta;

type Story = StoryObj;

/** Every surface at rest: exactly how it looks without the pressed state. */
export const Rest: Story = { render: render({}) };

/** A finger down: scaled to 0.97, in the shade of the surface's own colour. */
export const Pressed: Story = { render: render({ pressed: true }) };

/** Disabled surfaces never get the class, so a press leaves them as they are. */
export const Disabled: Story = { render: render({ disabled: true }) };

/** With reduced motion the press changes colour only. */
export const PressedReducedMotion: Story = {
  render: render({ pressed: true, reducedMotion: true }),
};

export const RestDark: Story = { render: render({ dark: true }) };

export const PressedDark: Story = {
  render: render({ pressed: true, dark: true }),
};

export const DisabledDark: Story = {
  render: render({ disabled: true, dark: true }),
};

export const PressedReducedMotionDark: Story = {
  render: render({ pressed: true, reducedMotion: true, dark: true }),
};
