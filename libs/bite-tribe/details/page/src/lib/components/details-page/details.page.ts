import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { Bite, Review } from 'model';
import {
  IonButton,
  IonChip,
  IonContent,
  IonImg,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonTextarea,
} from '@ionic/angular/standalone';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'details-page',
  templateUrl: './details.page.html',
  styleUrls: ['./details.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonImg,
    CurrencyPipe,
    IonChip,
    IonList,
    IonListHeader,
    IonLabel,
    IonItem,
    IonNote,
    IonInput,
    IonTextarea,
    IonButton,
  ],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class DetailsPage {
  bite = input<Bite>();
  reviews = input<Review[]>([
    {
      id: '1',
      author: 'Jacob',
      comment: 'Really tasty and flavourful',
      date: '2 days', // '2025-04-21T00:00:00.000Z',
    },
  ]);
}
