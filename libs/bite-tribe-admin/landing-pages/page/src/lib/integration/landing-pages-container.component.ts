import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { LandingPagesComponent } from '../component/landing-pages.component';
import { LandingPagesService } from './landing-pages.service';

@Component({
  template: `<lib-landing-pages
    class="ion-page"
    [pages]="service.pages()"
    [loading]="service.loading()"
    [loadFailed]="service.loadFailed()"
    [editing]="service.editing()"
    [current]="service.current()"
    [draft]="service.draft()"
    [entries]="service.entries()"
    [results]="service.results()"
    [searching]="service.searching()"
    [busy]="service.busy()"
    [publishable]="service.publishable()"
    [full]="service.full()"
    [previewHtml]="service.previewHtml()"
    (newPage)="service.newPage()"
    (openPage)="service.open($event)"
    (fieldChange)="service.updateField($event.field, $event.value)"
    (searchSubmit)="service.search($event)"
    (addBite)="service.addBite($event)"
    (removeBite)="service.removeBite($event)"
    (moveBite)="service.move($event.biteId, $event.offset)"
    (save)="service.save()"
    (preview)="service.preview()"
    (closePreview)="service.closePreview()"
    (publish)="service.publish()"
    (withdraw)="service.withdraw()"
    (logoutClick)="service.logout()"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LandingPagesComponent],
})
export class LandingPagesContainer implements OnInit {
  readonly service = inject(LandingPagesService);

  ngOnInit(): void {
    void this.service.load();
  }
}
