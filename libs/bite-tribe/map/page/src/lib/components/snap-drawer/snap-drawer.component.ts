import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  Renderer2,
} from '@angular/core';
import { NgStyle } from '@angular/common';

@Component({
  selector: 'bt-snap-drawer',
  templateUrl: './snap-drawer.component.html',
  styleUrl: './snap-drawer.component.scss',
  imports: [NgStyle],
  standalone: true,
})
export class SnapDrawerComponent implements OnInit {
  /**
   * Snap points in % of screen height (0 = top, 100 = bottom).
   * Example: [90, 50, 10] → mostly closed, half, nearly open.
   */
  @Input() snapPercents: number[] = [90, 50, 10];

  translateY = 0;
  private dragging = false;
  private startY = 0;
  private startTranslateY = 0;
  private snapPixels: number[] = [];

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit(): void {
    this.computeSnapPixels();
    // Start at the "closed" position (largest percent = lowest point)
    this.translateY = Math.max(...this.snapPixels);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.computeSnapPixels();
    this.snapToClosest();
  }

  private computeSnapPixels(): void {
    const vh = window.innerHeight;
    this.snapPixels = this.snapPercents.map((p) => (vh * p) / 100);
  }

  onPointerDown(event: PointerEvent): void {
    this.dragging = true;
    this.startY = event.clientY;
    this.startTranslateY = this.translateY;
    this.setTransition(false);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    const delta = event.clientY - this.startY;
    let newY = this.startTranslateY + delta;
    const min = Math.min(...this.snapPixels); // top-most (open)
    const max = Math.max(...this.snapPixels); // bottom-most (closed)
    if (newY < min) newY = min;
    if (newY > max) newY = max;
    this.translateY = newY;
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    this.setTransition(true);
    this.snapToClosest();
  }

  private setTransition(enabled: boolean): void {
    const drawerEl = this.el.nativeElement.querySelector('.drawer');
    this.renderer.setStyle(
      drawerEl,
      'transition',
      enabled ? 'transform 0.3s ease' : 'none'
    );
  }

  private snapToClosest(): void {
    let closest = this.snapPixels[0];
    let minDiff = Math.abs(this.translateY - closest);
    for (const sp of this.snapPixels) {
      const diff = Math.abs(this.translateY - sp);
      if (diff < minDiff) {
        minDiff = diff;
        closest = sp;
      }
    }
    this.translateY = closest;
  }
}
