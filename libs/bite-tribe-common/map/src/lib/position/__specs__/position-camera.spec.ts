// The camera is the point here, so these run on the real Leaflet rather than
// the repository-wide mock.
jest.unmock('leaflet');
jest.unmock('leaflet.markercluster');
jest.unmock('leaflet-usermarker');

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import L from 'leaflet';
import { Geopoint } from 'model';
import { PositionComponent } from '../position.component';
import { TILE_LAYER_FACTORY } from '../../map/tile-layer.token';
import { DEFAULT_ZOOM } from '../../map/model/default-zoom';

@Component({
  imports: [PositionComponent, ReactiveFormsModule],
  template: `<position [formControl]="control" [gpsPosition]="gps()" />`,
})
class HostComponent {
  readonly control = new FormControl<Geopoint | null>(null);
  readonly gps = signal<Geopoint | undefined>(undefined);
}

const MUNICH: Geopoint = { latitude: 48.137, longitude: 11.575 };
const BLED: Geopoint = { latitude: 46.369, longitude: 14.114 };

/**
 * Where the position picker opens (GitHub issue #2226). A form fills its value
 * after the map has rendered, as the business app's position section does;
 * the map then opened on the world and centred the position at world zoom.
 */
describe('position picker camera', () => {
  let setView: jest.SpyInstance;

  beforeEach(() => {
    setView = jest.spyOn(L.Map.prototype, 'setView');
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TILE_LAYER_FACTORY,
          useValue: (): L.TileLayer => L.tileLayer('', { maxZoom: 19 }),
        },
      ],
    });
  });

  afterEach(() => setView.mockRestore());

  const lastView = (): [L.LatLngExpression, number | undefined] =>
    setView.mock.calls.at(-1) as [L.LatLngExpression, number | undefined];

  it('opens at street level on a position that arrives after the first render', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.control.setValue(MUNICH);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(lastView()).toEqual([[48.137, 11.575], DEFAULT_ZOOM]);
  });

  it('opens at street level on a position that is there from the start', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.control.setValue(MUNICH);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(lastView()).toEqual([[48.137, 11.575], DEFAULT_ZOOM]);
  });

  it('opens on the device position, at street level, when there is no value', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.gps.set(BLED);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(lastView()).toEqual([[46.369, 14.114], DEFAULT_ZOOM]);
  });

  it('leaves a stored position in view when the device position arrives', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.control.setValue(MUNICH);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.gps.set(BLED);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(lastView()).toEqual([[48.137, 11.575], DEFAULT_ZOOM]);
  });
});
