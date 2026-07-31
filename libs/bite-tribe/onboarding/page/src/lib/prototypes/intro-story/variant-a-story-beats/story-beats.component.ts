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

const BEAT_MS = 14000;

/**
 * B — Stories-style chrome around live BiteTribe screens (auto-advance).
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

  private timer: ReturnType<typeof setTimeout> | null = null;
  private startedAt = 0;
  private remaining = BEAT_MS;

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

  onPressStart(): void {
    if (this.paused()) {
      return;
    }
    this.paused.set(true);
    this.clearTimer();
    this.remaining = Math.max(0, BEAT_MS - (Date.now() - this.startedAt));
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
    if (this.index() === 0) {
      this.restartBeat();
      return;
    }
    this.index.update((i) => i - 1);
    this.restartBeat();
  }

  nextBeat(event?: Event): void {
    event?.stopPropagation();
    if (this.isLast()) {
      this.finish();
      return;
    }
    this.index.update((i) => i + 1);
    this.restartBeat();
  }

  skip(): void {
    this.clearTimer();
    this.skipped.emit();
  }

  finish(): void {
    this.clearTimer();
    this.completed.emit();
  }

  private restartBeat(): void {
    this.animKey.update((k) => k + 1);
    this.remaining = BEAT_MS;
    this.paused.set(false);
    this.startBeat();
  }

  private startBeat(duration = BEAT_MS): void {
    this.clearTimer();
    this.startedAt = Date.now();
    this.remaining = duration;
    this.timer = setTimeout(() => this.nextBeat(), duration);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
