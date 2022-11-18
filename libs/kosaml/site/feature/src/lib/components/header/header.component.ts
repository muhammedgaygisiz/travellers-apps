import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'kosaml-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  title = 'kosaml';

  @Input()
  isAuthenticated = true;

  @Output()
  toggleProjectBar = new EventEmitter();

  @Output()
  toggleToolBar = new EventEmitter();

  onToggleProjectBar() {
    this.toggleProjectBar.emit();
  }

  onToggleToolBar() {
    this.toggleToolBar.emit();
  }
}
