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
import { computeSnapOffsets } from './utils/compute-snap-offsets';
import { getLowestSnap } from './utils/get-lowest-snap';
import { getHighestSnap } from './utils/get-highest-snap';
import { findNextSnapDown } from './utils/find-next-snap-down';
import { findClosestSnap } from './utils/find-closest-snap';

@Component({
  selector: 'bt-snap-drawer',
  templateUrl: './snap-drawer.component.html',
  styleUrl: './snap-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnapDrawerComponent implements OnInit, AfterViewInit {
  // default: bite component size
  snapPixels = input([60, 480]);

  translateY = 0;
  private dragging = false;
  private startY = 0;
  private startTranslateY = 0;
  private snapOffsets: number[] = [];
  private dragDirection = 0; // Track drag direction
  private dragThreshold = 50; // Minimum drag distance to consider direction

  private elementRef: ElementRef = inject(ElementRef);
  private renderer: Renderer2 = inject(Renderer2);

  @HostListener('window:resize')
  onResize(): void {
    this.snapToClosest();
  }

  ngOnInit(): void {
    this.snapOffsets = computeSnapOffsets(this.snapPixels());
    this.translateY = getLowestSnap(this.snapOffsets);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.setTransition(true);
    }, 0);
  }

  snapOpenOrClosed(): void {
    const isOpen = this.translateY < getLowestSnap(this.snapOffsets);
    this.translateY = isOpen
      ? getLowestSnap(this.snapOffsets)
      : getHighestSnap(this.snapOffsets);
  }

  onPointerDown(event: PointerEvent): void {
    this.dragging = true;
    this.startY = event.clientY;
    this.startTranslateY = this.translateY;
    this.dragDirection = 0;
    this.setTransition(false);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    const delta = event.clientY - this.startY;

    // avoid jitter
    if (Math.abs(delta) > 10) {
      this.dragDirection = delta > 0 ? 1 : -1; // 1 = down, -1 = up
    }

    let newY = this.startTranslateY + delta;
    const min = Math.min(...this.snapOffsets);
    const max = Math.max(...this.snapOffsets);
    if (newY < min) newY = min;
    if (newY > max) newY = max;
    this.translateY = newY;
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    this.setTransition(true);
    this.snapWithDirection();
  }

  private setTransition(enabled: boolean): void {
    const drawerEl = this.elementRef.nativeElement.querySelector('.drawer');
    this.renderer.setStyle(
      drawerEl,
      'transition',
      enabled ? 'transform 0.3s ease' : 'none'
    );
  }

  private snapWithDirection(): void {
    const dragDistance = Math.abs(this.translateY - this.startTranslateY);
    if (dragDistance <= this.dragThreshold) {
      this.snapToClosest();
      return;
    }
    this.translateY =
      this.dragDirection > 0
        ? findNextSnapDown(this.snapOffsets, this.translateY)
        : this.findNextSnapUp(this.translateY);
  }

  private findNextSnapUp(currentY: number): number {
    const validSnaps = this.snapOffsets.filter((snap) => snap < currentY);
    return validSnaps.length > 0
      ? Math.max(...validSnaps)
      : getHighestSnap(this.snapOffsets);
  }

  private snapToClosest(): void {
    this.translateY = findClosestSnap(this.snapOffsets, this.translateY);
  }
}
