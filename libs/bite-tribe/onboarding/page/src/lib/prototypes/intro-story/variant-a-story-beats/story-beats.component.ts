import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
  output,
  signal,
} from '@angular/core';
import { INTRO_STORY_SCENES, type IntroStoryScene } from '../intro-story.model';
import { RealUiSourceComponent } from '../source-real-ui/real-ui-source.component';

/** Fallback only — prefer advancing when the gesture beat completes. */
const BEAT_FALLBACK_MS = 28000;
const CHAPTER_CROSSFADE_MS = 520;

/**
 * B — Stories-style chrome around live BiteTribe screens.
 * Chapters advance after resolve→celebrate (gesture completed), with a soft
 * crossfade — never a hard mid-cheer cut.
 */
@Component({
  selector: 'intro-story-beats',
  templateUrl: './story-beats.component.html',
  styleUrl: './story-beats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RealUiSourceComponent],
})
export class StoryBeatsComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);

  completed = output<void>();
  skipped = output<void>();

  readonly scenes = INTRO_STORY_SCENES;
  readonly index = signal(0);
  readonly paused = signal(false);
  readonly animKey = signal(0);
  readonly chapterFading = signal(false);
  readonly finale = signal(false);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private startedAt = 0;
  private remaining = BEAT_FALLBACK_MS;

  ngOnInit(): void {
    this.startBeat();
    this.destroyRef.onDestroy(() => this.clearTimer());
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  scene(): IntroStoryScene {
    return this.scenes[this.index()];
  }

  isLast(): boolean {
    return this.index() >= this.scenes.length - 1;
  }

  onBeatCompleted(): void {
    if (this.paused() || this.chapterFading()) {
      return;
    }
    this.clearTimer();
    if (this.isLast()) {
      this.finale.set(true);
      return;
    }
    this.advanceChapter();
  }

  onPressStart(): void {
    if (this.paused()) {
      return;
    }
    this.paused.set(true);
    this.clearTimer();
    this.remaining = Math.max(
      0,
      BEAT_FALLBACK_MS - (Date.now() - this.startedAt),
    );
  }

  onPressEnd(): void {
    if (!this.paused()) {
      return;
    }
    this.paused.set(false);
    this.startBeat(this.remaining);
  }

  prevBeat(event?: Event): void {
    event?.stopPropagation();
    this.finale.set(false);
    if (this.index() === 0) {
      this.restartBeat();
      return;
    }
    this.index.update((i) => i - 1);
    this.restartBeat();
  }

  nextBeat(event?: Event): void {
    event?.stopPropagation();
    this.finale.set(false);
    if (this.isLast()) {
      this.finish();
      return;
    }
    this.advanceChapter();
  }

  skip(): void {
    this.clearTimer();
    this.skipped.emit();
  }

  finish(): void {
    this.clearTimer();
    this.completed.emit();
  }

  private advanceChapter(): void {
    this.chapterFading.set(true);
    window.setTimeout(() => {
      this.index.update((i) => Math.min(i + 1, this.scenes.length - 1));
      this.animKey.update((k) => k + 1);
      this.remaining = BEAT_FALLBACK_MS;
      this.paused.set(false);
      this.chapterFading.set(false);
      this.startBeat();
    }, CHAPTER_CROSSFADE_MS);
  }

  private restartBeat(): void {
    this.animKey.update((k) => k + 1);
    this.remaining = BEAT_FALLBACK_MS;
    this.paused.set(false);
    this.chapterFading.set(false);
    this.startBeat();
  }

  private startBeat(duration = BEAT_FALLBACK_MS): void {
    this.clearTimer();
    this.startedAt = Date.now();
    this.remaining = duration;
    // Safety net if a gesture script stalls — prefer onBeatCompleted.
    this.timer = setTimeout(() => this.onBeatCompleted(), duration);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
