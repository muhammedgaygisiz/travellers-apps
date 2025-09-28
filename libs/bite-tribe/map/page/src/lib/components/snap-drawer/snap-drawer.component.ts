import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  OnInit,
  Renderer2,
} from '@angular/core';

@Component({
  selector: 'bt-snap-drawer',
  templateUrl: './snap-drawer.component.html',
  styleUrl: './snap-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnapDrawerComponent implements OnInit, AfterViewInit {
  /**
   * Snap positions in pixels from the bottom of the screen.
   * Example: [0, 200, 500]
   * - 0   → drawer closed
   * - 200 → 200px of drawer visible
   * - 500 → 500px of drawer visible
   * default: bite-compact component heights
   */
  snapPixels = input([60, 480]);

  translateY = 0;
  private dragging = false;
  private startY = 0;
  private startTranslateY = 0;
  private snapOffsets: number[] = [];

  private elementRef: ElementRef = inject(ElementRef);
  private renderer: Renderer2 = inject(Renderer2);

  @HostListener('window:resize')
  onResize(): void {
    this.snapToClosest();
  }

  ngOnInit(): void {
    this.computeSnapOffsets();
    this.translateY = this.getLowestSnap(this.snapOffsets);
  }

  ngAfterViewInit(): void {
    // Re-enable transitions AFTER first render
    setTimeout(() => this.setTransition(true), 0);
  }

  snapOpenOrClosed(): void {
    const isOpen = this.translateY < this.getLowestSnap(this.snapOffsets);
    if (isOpen) {
      this.translateY = this.getLowestSnap(this.snapOffsets);
      return;
    }
    this.translateY = this.getHighestSnap(this.snapOffsets);
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
    const min = Math.min(...this.snapOffsets); // top-most (most open)
    const max = Math.max(...this.snapOffsets); // bottom-most (closed)
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
    const drawerEl = this.elementRef.nativeElement.querySelector('.drawer');
    this.renderer.setStyle(
      drawerEl,
      'transition',
      enabled ? 'transform 0.3s ease' : 'none'
    );
  }

  private snapToClosest(): void {
    this.translateY = this.findClosestSnap(this.translateY);
  }

  private findClosestSnap(value: number): number {
    let closest = this.snapOffsets[0];
    let minDiff = Math.abs(value - closest);
    for (const sp of this.snapOffsets) {
      const diff = Math.abs(value - sp);
      if (diff < minDiff) {
        minDiff = diff;
        closest = sp;
      }
    }
    return closest;
  }

  private getLowestSnap(snapOffsets: number[]): number {
    return Math.max(...snapOffsets);
  }

  private getHighestSnap(snapOffsets: number[]): number {
    return Math.min(...snapOffsets);
  }

  private computeSnapOffsets(): void {
    const windowInnerHeight = window.innerHeight;
    this.snapOffsets = this.snapPixels().map(
      (snapPixel) => windowInnerHeight - snapPixel
    );
  }
}
