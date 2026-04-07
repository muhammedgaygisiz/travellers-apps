import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';
import 'leaflet';
import 'leaflet.markercluster';

import '@angular/localize/init';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

URL.createObjectURL = jest.fn(() => 'blob:mock-url');
