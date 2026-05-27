import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { MapComponent } from '../map/map.component';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Geopoint } from 'model';

@Component({
  selector: 'position',
  template: `
    <bt-map
      [readonly]="readonly()"
      [dragging]="dragging()"
      [geopoints]="[value()!]"
      (clickOnMap)="setValue($event)"
    />
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
  readonly = input(false, { transform: booleanAttribute });
  dragging = input(true, { transform: booleanAttribute });

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  _onChange: (value: Geopoint | null) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  _onTouch: () => void = () => {};

  writeValue(obj: any): void {
    this.value.set(obj);
  }

  registerOnChange(fn: any): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this._onTouch = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  setValue(position: Geopoint): void {
    this.value.set(position);
    this._onChange(position);
    this._onTouch();
  }
}
