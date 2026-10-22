import {
  AfterViewInit,
  Directive,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  applicationConfig,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import {
  IonAlert,
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

/**
 * Marks the confirming button of a presented alert pressed. Its buttons exist
 * only once the alert has rendered them, so the class is set as soon as they
 * appear rather than on an overlay event whose timing a story cannot rely on.
 */
@Directive({ selector: '[libStoryPressedAlertButton]' })
class StoryPressedAlertButtonDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly observer = new MutationObserver(() => this.markPressed());

  ngAfterViewInit(): void {
    if (!this.markPressed()) {
      this.observer.observe(this.host.nativeElement, {
        childList: true,
        subtree: true,
      });
    }
  }

  ngOnDestroy(): void {
    this.observer.disconnect();
  }

  private markPressed(): boolean {
    const buttons = this.host.nativeElement.querySelectorAll('.alert-button');
    const confirm = buttons[buttons.length - 1];

    if (!confirm) {
      return false;
    }

    confirm.classList.add(PRESSED_CLASS);
    this.observer.disconnect();
    return true;
  }
}

/**
 * Ionic moves a presented alert to `<body>`, out of any wrapper, so an alert
 * story cannot scope the styles the way the other stories do. It does what the
 * app does - the opt-in class on the document element - and the dark palette
 * goes on the alert itself for the same reason.
 *
 * Moved out of Angular's tree, the alert also outlives the story: Loki
 * switches stories without reloading, and a leftover alert would sit over every
 * story captured after it, with the page's scroll still locked. So the class,
 * the alert and the scroll lock are all taken away when the story is torn down.
 */
@Directive({ selector: '[libStoryAlertRoot]' })
class StoryAlertRootDirective implements OnInit, OnDestroy {
  readonly storyAlertDark = input(false);

  private readonly host = inject(ElementRef<HTMLElement>);

  ngOnInit(): void {
    document.documentElement.classList.add(PRESS_FEEDBACK_ROOT_CLASS);

    if (this.storyAlertDark()) {
      DARK.split('; ').forEach((declaration) => {
        const [name, value] = declaration.split(': ');
        this.host.nativeElement.style.setProperty(name, value);
      });
    }
  }

  ngOnDestroy(): void {
    document.documentElement.classList.remove(PRESS_FEEDBACK_ROOT_CLASS);
    this.host.nativeElement.remove();
    // Ionic locks the page's scroll while an overlay is open and only lifts it
    // on a dismissal, which a removed alert never makes.
    document.body.classList.remove('backdrop-no-scroll');
  }
}

/**
 * A destructive confirmation, presented. In the app the press listener marks
 * the button under the finger; here the confirming one is held pressed.
 */
const renderAlert =
  (variant: Pick<Variant, 'pressed' | 'dark'>): StoryObj['render'] =>
  () => ({
    props: {
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive' },
      ],
    },
    template: `
      <div
        style="${variant.dark ? DARK + '; ' : ''}background: var(--ion-background-color, #fff); min-height: 100vh"
      >
        <ion-alert
          libStoryAlertRoot
          [storyAlertDark]="${variant.dark ? 'true' : 'false'}"
          [isOpen]="true"
          [animated]="false"
          [backdropDismiss]="false"
          header="Delete Bite"
          message="Are you sure you want to delete this Bite?"
          [buttons]="buttons"
          ${variant.pressed ? 'libStoryPressedAlertButton' : ''}
        />
      </div>
    `,
  });

export default {
  title: 'Components/Pressed State',
  decorators: [
    applicationConfig({
      providers: [provideIonicAngular(getIonicConfig())],
    }),
    moduleMetadata({
      imports: [
        IonAlert,
        StoryPressedAlertButtonDirective,
        StoryAlertRootDirective,
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

/**
 * An alert at rest. Its buttons are segments of the alert's frame, so they
 * press by tint alone, with no scale (issue #1766).
 */
export const AlertRest: Story = { render: renderAlert({}) };

/** The confirming button of an alert with a finger down on it. */
export const AlertPressed: Story = { render: renderAlert({ pressed: true }) };

export const AlertRestDark: Story = { render: renderAlert({ dark: true }) };

export const AlertPressedDark: Story = {
  render: renderAlert({ pressed: true, dark: true }),
};
