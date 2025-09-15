import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'lib-start',
  templateUrl: './start.html',
  styleUrl: './start.scss',
  imports: [IonContent, IonButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Start {}
