import {
  ChangeDetectionStrategy,
  Component,
  computed,
  output,
  signal,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { INTRO_STORY_SCENES } from '../intro-story.model';
import { RealUiSourceComponent } from '../source-real-ui/real-ui-source.component';

/**
 * D — Chapter wizard chrome around live BiteTribe screens.
 */
@Component({
  selector: 'intro-kinetic-chapters',
  templateUrl: './kinetic-chapters.component.html',
  styleUrl: './kinetic-chapters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, RealUiSourceComponent],
})
export class KineticChaptersComponent {
  completed = output<void>();
  skipped = output<void>();

  readonly scenes = INTRO_STORY_SCENES;
  readonly index = signal(0);

  readonly scene = computed(() => this.scenes[this.index()]);
  readonly isFirst = computed(() => this.index() === 0);
  readonly isLast = computed(() => this.index() >= this.scenes.length - 1);
  readonly chapterLabel = computed(() => `Chapter ${this.index() + 1}`);

  next(): void {
    if (this.isLast()) {
      this.completed.emit();
      return;
    }
    this.index.update((i) => i + 1);
  }

  back(): void {
    if (this.isFirst()) {
      return;
    }
    this.index.update((i) => i - 1);
  }

  skip(): void {
    this.skipped.emit();
  }

  finish(): void {
    this.completed.emit();
  }

  goTo(i: number): void {
    if (i < 0 || i >= this.scenes.length || i === this.index()) {
      return;
    }
    this.index.set(i);
  }
}
