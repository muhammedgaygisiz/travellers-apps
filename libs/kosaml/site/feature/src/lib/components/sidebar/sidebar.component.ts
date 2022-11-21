import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { FileNode } from '@travellers-apps/kosaml/store/feature';

@Component({
  selector: 'kosaml-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
  @Input()
  isProjectBarOpen: boolean | null = false;

  @Input()
  isToolBarOpen?: boolean;

  @Input()
  project?: FileNode[];

  @Input()
  marginTop: number = 40 + 36;

  @Input()
  width?: number;

  @ViewChild('sidenav', { static: true, read: ElementRef })
  matSideNav?: ElementRef;

  xOffset?: number;
  startingWidth?: number;
  isResizing?: boolean = false;

  onMouseDown(event: any) {
    this.isResizing = true;

    this.xOffset = event.pageX;
    this.startingWidth = this.matSideNav?.nativeElement.clientWidth;

    this.setMouseCursorToResize();

    event.preventDefault();
  }

  onMouseUp() {
    if (this.isResizing) {
      this.isResizing = false;
      // this.sidebarWidthService.storeSidebarWidth(this.getWidth());
      // dispatch action from here to save final width in store
      this.resetMouseCursor();
    }
  }

  onMouseMove(event: any) {
    event.preventDefault();

    if (!this.isResizing) {
      return;
    }

    if (!this.xOffset) {
      return;
    }

    if (!this.startingWidth) {
      return;
    }

    this.setNewWidth(event.pageX - this.xOffset + this.startingWidth);
  }

  private resetMouseCursor() {
    document.documentElement.style.cursor = 'default';
  }

  private setMouseCursorToResize() {
    document.documentElement.style.cursor = 'col-resize';
  }

  private setNewWidth(newWidth: number) {
    if (!this.matSideNav) {
      return;
    }

    this.matSideNav.nativeElement.style.width = `${newWidth}px`;
  }

  private getWidth() {
    // return this.matSideNav.nativeElement.style.width;
  }
}
