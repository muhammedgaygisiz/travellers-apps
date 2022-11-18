import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { FileNode } from '../../model/filenode.model';

@Component({
  selector: 'kosaml-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements AfterViewInit {
  @Input()
  isProjectBarOpen?: boolean;

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

  // constructor(
  //  private sidebarWidthService: SidebarWidthService
  // ) { }

  ngAfterViewInit() {
    console.log('');
    //this.setNewWidth(this.width);
  }

  onMouseDown(event: any) {
    this.isResizing = true;

    this.xOffset = event.pageX;
    // this.startingWidth = this.matSideNav.nativeElement.clientWidth;

    this.setMouseCursorToResize();

    event.preventDefault();
  }

  onMouseUp() {
    if (this.isResizing) {
      this.isResizing = false;
      // his.sidebarWidthService.storeSidebarWidth(this.getWidth());
      this.resetMouseCursor();
    }
  }

  onMouseMove(event: any) {
    event.preventDefault();

    if (this.isResizing) {
      // this.setNewWidth(event.pageX - this.xOffset + this.startingWidth)
      // this.sidebarWidthService.next(this.getWidth())
    }
  }

  private resetMouseCursor() {
    document.documentElement.style.cursor = 'default';
  }

  private setMouseCursorToResize() {
    document.documentElement.style.cursor = 'col-resize';
  }

  private setNewWidth(newWidth: number) {
    console.log(newWidth);
    // this.matSideNav.nativeElement.style.width =
    //   `${newWidth}px`;
  }

  private getWidth() {
    // return this.matSideNav.nativeElement.style.width;
  }
}
