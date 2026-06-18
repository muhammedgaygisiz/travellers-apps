import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { ChipComponent } from '../chip.component';

export interface ChipRadioOption {
  label: string;
  value: string;
}

@Component({
  selector: 'bt-chip-radio-group',
  templateUrl: './chip-radio-group.component.html',
  styleUrl: './chip-radio-group.component.scss',
  imports: [ChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipRadioGroupComponent {
  options = input<ChipRadioOption[]>([]);
  selectedValue = input<string>();

  valueChange = output<string>();
}
