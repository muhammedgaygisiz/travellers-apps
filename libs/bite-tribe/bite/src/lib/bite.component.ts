import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'bt-bite',
  imports: [
    CommonModule,
    PageComponent,
    IonCard,
    IonIcon,
    IonCardContent,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    RouterLink,
    IonContent,
  ],
  templateUrl: './bite.component.html',
  styleUrl: './bite.component.scss',
})
export class BiteTribeBiteComponent {}
