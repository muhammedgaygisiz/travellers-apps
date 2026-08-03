/**
 * SoftDotPointer — subtle circular touch indicator for intro-story demos.
 * Position + pressed only. No cartoon hand, no blue highlight borders.
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'intro-soft-dot-pointer',
  templateUrl: './soft-dot-pointer.component.html',
  styleUrl: './soft-dot-pointer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoftDotPointerComponent {
  /** Native-space X % (0–100). */
  x = input(50);
  /** Native-space Y % (0–100). */
  y = input(70);
  visible = input(false);
  pressed = input(false);
  /** Optional one-shot ripple key; pass `{x,y,key}` to trigger. */
  ripple = input<{ x: number; y: number; key: number } | null>(null);
}
