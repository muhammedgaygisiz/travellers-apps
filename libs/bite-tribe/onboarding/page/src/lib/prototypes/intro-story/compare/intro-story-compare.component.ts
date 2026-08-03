/**
 * Comparison shell — icons-only vs real-UI interaction chromes.
 */
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IconsOnlyComponent } from '../icons-only/icons-only.component';
import { StoryBeatsComponent } from '../variant-a-story-beats/story-beats.component';
import { SwipeNarrativeComponent } from '../variant-b-swipe-narrative/swipe-narrative.component';
import { KineticChaptersComponent } from '../variant-c-kinetic-chapters/kinetic-chapters.component';

type VariantId = 'icons' | 'beats' | 'swipe' | 'chapters';

@Component({
  selector: 'intro-story-compare',
  templateUrl: './intro-story-compare.component.html',
  styleUrl: './intro-story-compare.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IconsOnlyComponent,
    StoryBeatsComponent,
    SwipeNarrativeComponent,
    KineticChaptersComponent,
  ],
})
export class IntroStoryCompareComponent {
  readonly variant = signal<VariantId>('beats');

  select(id: VariantId): void {
    this.variant.set(id);
  }
}
