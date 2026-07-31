import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import {
  INTRO_STORY_SCENES,
  type IntroStorySceneId,
} from '../intro-story.model';
import { RealUiSourceComponent } from '../source-real-ui/real-ui-source.component';
import { tipsForArc } from '../progressive-tips.model';

const BEAT_ORDER: IntroStorySceneId[] = ['discover', 'share', 'tribe', 'go'];

/**
 * J — Soft Whisper chrome + animated real-UI story flows.
 * Gestures drive the phone; Outfit captions below the stage narrate. Skip only.
 */
@Component({
  selector: 'intro-whisper-flow',
  templateUrl: './whisper-flow.component.html',
  styleUrl: './whisper-flow.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RealUiSourceComponent],
})
export class WhisperFlowComponent {
  /** Single beat, or full tour. */
  arc = input<IntroStorySceneId | 'all'>('all');
  badge = input('Whisper Flow');
  showSkip = input(true);

  readonly beatIndex = signal(0);
  readonly finished = signal(false);

  readonly beats = computed((): IntroStorySceneId[] => {
    const a = this.arc();
    return a === 'all' ? BEAT_ORDER : [a];
  });

  readonly beatId = computed(
    (): IntroStorySceneId =>
      this.beats()[Math.min(this.beatIndex(), this.beats().length - 1)] ??
      'discover',
  );

  readonly scene = computed(
    () =>
      INTRO_STORY_SCENES.find((s) => s.id === this.beatId()) ??
      INTRO_STORY_SCENES[0],
  );

  /** Soft caption from the first tip of the active arc. */
  readonly whisper = computed(() => {
    const tips = tipsForArc(this.beatId());
    const tip = tips[0];
    return {
      title: tip?.title ?? this.scene().headline,
      body: tip?.body ?? this.scene().line,
    };
  });

  onBeatCompleted(): void {
    if (this.finished()) {
      return;
    }
    const next = this.beatIndex() + 1;
    if (next >= this.beats().length) {
      this.finished.set(true);
      return;
    }
    this.beatIndex.set(next);
  }

  skipTour(): void {
    this.finished.set(true);
  }

  replay(): void {
    this.finished.set(false);
    this.beatIndex.set(0);
  }
}
