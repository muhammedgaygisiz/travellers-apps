import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  signal,
} from '@angular/core';
import { MapComponent } from '../map/map.component';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Geopoint } from 'model';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'position',
  template: `
    @if(value()) {
    <bt-map [positions]="[value()!]" (positionSelected)="setValue($event)" />
    }
  `,
  imports: [MapComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PositionComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionComponent implements ControlValueAccessor {
  value = signal<Geopoint | null>(null);
  disabled = signal<boolean | null>(null);

  // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-empty-function
  _onChange: (value: Geopoint | null) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  _onTouch: () => void = () => {};

  // eslint-disable-next-line no-unused-vars
  writeValue(obj: any): void {
    this.value.set(obj);
  }

  // eslint-disable-next-line no-unused-vars
  registerOnChange(fn: any): void {
    this._onChange = fn;
  }

  // eslint-disable-next-line no-unused-vars
  registerOnTouched(fn: any): void {
    this._onTouch = fn;
  }

  // eslint-disable-next-line no-unused-vars
  setDisabledState?(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  setValue(position: Geopoint) {
    this.value.set(position);
    this._onChange(position);
    this._onTouch();
  }
}
