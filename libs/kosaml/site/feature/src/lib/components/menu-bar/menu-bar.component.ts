import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'kosaml-menu-bar',
  templateUrl: './menu-bar.component.html',
  styleUrls: ['./menu-bar.component.scss'],
})
export class MenuBarComponent {
  @Output()
  logout = new EventEmitter();

  onLogout() {
    this.logout.emit();
  }
}
