import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';
import 'leaflet';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
