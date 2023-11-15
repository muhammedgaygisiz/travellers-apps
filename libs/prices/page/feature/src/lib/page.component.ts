import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonFooter,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { NgIf } from '@angular/common';

@Component({
  standalone: true,
  selector: 'ta-page',
  templateUrl: './page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonIcon,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonFooter,
    NgIf,
  ],
})
export class PageComponent {
  @Input()
  enableBackButton = false;

  @Input()
  isAuthenticated: boolean | null = false;

  @Input()
  hideAuthButton = false;

  @Output()
  public addItemClick: EventEmitter<void> = new EventEmitter();

  @Output()
  public loginClick: EventEmitter<void> = new EventEmitter();

  @Output()
  public logoutClick: EventEmitter<void> = new EventEmitter();
}
