import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { GuestBitesPage } from './guest-bites-page.component';
import { GuestBitesService } from './guest-bites.service';

/** Guest Bites, at `restaurant/:restaurantId/menu/:menuId/guest-bites`. */
@Component({
  template: `
    <bt-guest-bites-page
      class="ion-page"
      [restaurant]="service.restaurant()"
      [menu]="service.menu()"
      [bites]="service.bites()"
      (linkBite)="service.link($event)"
      (dismissBite)="service.dismiss($event)"
    />
  `,
  imports: [GuestBitesPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestBitesContainer implements OnInit {
  service = inject(GuestBitesService);

  ngOnInit(): void {
    void this.service.load();
  }
}
