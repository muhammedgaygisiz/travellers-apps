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
import { IonIcon } from '@ionic/angular/standalone';
import { INTRO_STORY_SCENES, type IntroStoryScene } from '../intro-story.model';

const BEAT_MS = 4200;

/**
 * A — Icons-only abstract intro.
 * Short copy + animated icon orbs. Baseline vs B/C/D real-UI chromes.
 */
@Component({
  selector: 'intro-icons-only',
  templateUrl: './icons-only.component.html',
  styleUrl: './icons-only.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
})
export class IconsOnlyComponent implements OnInit, OnDestroy {
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

  onTap(event: MouseEvent): void {
    const width = (event.currentTarget as HTMLElement).clientWidth;
    if (event.offsetX < width * 0.28) {
      this.prev();
      return;
    }
    this.next();
  }

  skip(): void {
    this.clearTimer();
    this.skipped.emit();
  }

  finish(): void {
    this.clearTimer();
    this.completed.emit();
  }

  private prev(): void {
    if (this.index() === 0) {
      this.restartBeat();
      return;
    }
    this.index.update((i) => i - 1);
    this.restartBeat();
  }

  private next(): void {
    if (this.isLast()) {
      this.finish();
      return;
    }
    this.index.update((i) => i + 1);
    this.restartBeat();
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
    this.timer = setTimeout(() => this.next(), duration);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
