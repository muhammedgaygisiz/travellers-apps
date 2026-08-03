import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Faithful iPhone 15-style device chrome for intro-story real-UI stages.
 * Content projects into the glass screen; bezel/island/status/home indicator
 * sit outside the intentional UI so filter chips stay visible.
 */
@Component({
  selector: 'intro-iphone-shell',
  templateUrl: './intro-iphone-shell.component.html',
  styleUrl: './intro-iphone-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntroIphoneShellComponent {
  /** Status-bar clock text. */
  time = input('9:41');
  /** When true, show a slightly darker status bar for map/dark screens. */
  darkStatus = input(false);
}
