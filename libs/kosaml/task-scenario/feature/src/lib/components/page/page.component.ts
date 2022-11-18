import { Component, Input, OnInit } from '@angular/core';
import { PageSize } from './pageSize.enum';

@Component({
  selector: 'kosaml-page',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss'],
})
export class PageComponent implements OnInit {
  @Input()
  size: PageSize = PageSize.M;

  width?: number;

  ngOnInit() {
    this.adjustWidth();
  }

  adjustWidth() {
    switch (this.size) {
      case PageSize.S:
        this.width = 400;
        break;
      case PageSize.L:
        this.width = 1600;
        break;
      default:
        this.width = 860;
        break;
    }
  }
}
