import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonChip, IonIcon, IonLabel } from '@ionic/angular/standalone';

@Component({
  selector: 'bt-chip',
  templateUrl: './chip.component.html',
  styleUrl: './chip.component.scss',
  imports: [IonChip, IonIcon, IonLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipComponent {
  label = input.required<string>();
  icon = input<string>();
  selected = input(false);
  removable = input(false);

  chipClick = output<void>();
  removeClick = output<void>();
}
