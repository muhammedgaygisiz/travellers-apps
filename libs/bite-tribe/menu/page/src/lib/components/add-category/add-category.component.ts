import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  IonButton,
  IonInput,
  IonItem,
  IonList,
} from '@ionic/angular/standalone';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-category.component.html',
  styleUrl: './add-category.component.scss',
  imports: [IonButton, IonInput, IonList, IonItem],
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'add-category',
})
export class AddCategoryComponent {}
