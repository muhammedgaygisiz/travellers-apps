import {
  Component,
  DOCUMENT,
  inject,
  input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { IonButton, provideIonicAngular } from '@ionic/angular/standalone';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { AnalyticsService } from 'ta-firestore';
import { ToastService } from 'toast';
import { getIonicConfig } from 'utils';
import { CelebrationService } from '../celebration.service';

/**
 * A page with one button that celebrates, in either theme. `dark` puts the
 * app's `html.dark` or `html.light` class on the document for as long as the
 * story is shown, because the confetti reads its colours from the document, not
 * from this host - and without `light`, a browser that prefers dark renders the
 * dark theme.
 */
@Component({
  selector: 'celebration-story-host',
  imports: [IonButton],
  template: `
    <div
      style="height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--ion-background-color)"
    >
      <ion-button (click)="celebrate()">Celebrate</ion-button>
    </div>
  `,
})
class CelebrationStoryHostComponent implements OnInit, OnDestroy {
  readonly dark = input(false);

  private readonly document = inject(DOCUMENT);
  private readonly celebration = inject(CelebrationService);

  ngOnInit(): void {
    const { classList } = this.document.documentElement;

    classList.toggle('dark', this.dark());
    classList.toggle('light', !this.dark());
  }

  ngOnDestroy(): void {
    this.document.documentElement.classList.remove('dark', 'light');
  }

  celebrate(): void {
    void this.celebration.celebrate('first-bite');
  }
}

/**
 * The toast copy for each moment arrives with the issue that wires it, and the
 * analytics event has nowhere to go here, so both are stubbed: these stories
 * show the burst alone.
 */
export default {
  title: 'Tech/Celebration',
  component: CelebrationStoryHostComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideIonicAngular(getIonicConfig()),
        {
          provide: ToastService,
          useValue: { present: async (): Promise<void> => undefined },
        },
        {
          provide: AnalyticsService,
          useValue: { logEvent: (): void => undefined },
        },
      ],
    }),
  ],
  parameters: {
    /**
     * Motion only: at rest both stories are a single button, and the burst a
     * still image would catch is random. Kept out of the visual-regression
     * run, like the reaction stories in `likes.stories.ts`.
     */
    loki: { skip: true },
  },
} as Meta<CelebrationStoryHostComponent>;

type Story = StoryObj<CelebrationStoryHostComponent>;

/**
 * Tap Celebrate: one burst rises from the bottom edge in the theme's primary,
 * brand and secondary colours and clears in about a second (issue #1795).
 * Tapping again while it runs draws nothing more. With reduced motion emulated
 * (DevTools → Rendering → `prefers-reduced-motion: reduce`), nothing is drawn.
 */
export const Light: Story = {
  args: { dark: false },
};

/** The same burst in the dark theme, where secondary turns to cream. */
export const Dark: Story = {
  args: { dark: true },
};
