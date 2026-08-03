import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import type { IntroStoryScene, IntroStorySceneId } from '../intro-story.model';

const VIDEO_BY_BEAT: Record<IntroStorySceneId, string> = {
  discover: '/assets/intro-story/discover.webm',
  share: '/assets/intro-story/share.webm',
  tribe: '/assets/intro-story/tribe.webm',
  go: '/assets/intro-story/go.webm',
};

/**
 * Archived helper: plays packaged intro webms.
 * Primary demos use RealUiSourceComponent instead.
 */
@Component({
  selector: 'intro-video-stage',
  templateUrl: './intro-video-stage.component.html',
  styleUrl: './intro-video-stage.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntroVideoStageComponent {
  scene = input.required<IntroStoryScene>();

  readonly videoFailed = signal(false);
  readonly videoSrc = computed(() => VIDEO_BY_BEAT[this.scene().id]);

  constructor() {
    effect(() => {
      this.scene();
      this.videoFailed.set(false);
    });
  }

  onVideoError(): void {
    this.videoFailed.set(true);
  }

  onVideoLoaded(): void {
    this.videoFailed.set(false);
  }
}
