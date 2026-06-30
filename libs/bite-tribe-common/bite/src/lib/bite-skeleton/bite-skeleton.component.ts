import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonSkeletonText,
} from '@ionic/angular/standalone';

@Component({
  selector: 'bt-bite-skeleton',
  templateUrl: './bite-skeleton.component.html',
  styleUrl: './bite-skeleton.component.scss',
  imports: [IonCard, IonCardContent, IonCardHeader, IonSkeletonText],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteSkeletonComponent {}
