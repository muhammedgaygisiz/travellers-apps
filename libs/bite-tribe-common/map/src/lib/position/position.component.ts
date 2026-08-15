import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { MapComponent } from '../map/map.component';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Geopoint } from 'model';
import { MarkerColor } from '../map/model/marker-color.enum';

/**
 * Id the single marker is tagged with, so {@link PositionComponent.markerColor}
 * can address it in the colour map the map component expects.
 */
const POSITION_MARKER_ID = 'position';

@Component({
  selector: 'position',
  template: `
    <bt-map
      [readonly]="readonly()"
      [dragging]="dragging()"
      [geopoints]="markerGeopoints()"
      [markerColors]="markerColors()"
      refitOnGeopointChanges
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

  /**
   * Colour of the marker. A form that knows where its position came from passes
   * the colour of that source, so the marker agrees with the source shown next
   * to it (issue #1325). Left unset the marker keeps the map's default red.
   */
  markerColor = input<MarkerColor>();

  /**
   * The value as the map's geopoint list. The marker carries an id only so the
   * colour can be addressed; the empty value is still passed through as-is, so
   * a map without a position behaves exactly as before.
   */
  markerGeopoints = computed<Geopoint[]>(() => {
    const value = this.value();

    return [value ? { ...value, id: POSITION_MARKER_ID } : value!];
  });

  markerColors = computed<Record<string, MarkerColor>>(() => {
    const color = this.markerColor();
    const colors: Record<string, MarkerColor> = {};

    if (color) {
      colors[POSITION_MARKER_ID] = color;
    }

    return colors;
  });

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  _onChange: (value: Geopoint | null) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  _onTouch: () => void = () => {};

  writeValue(obj: Geopoint | null): void {
    this.value.set(obj);
  }

  registerOnChange(fn: (value: Geopoint | null) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
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
