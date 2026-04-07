import { TextDecoder, TextEncoder } from 'util';
import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

import '@angular/localize/init';

setupZonelessTestEnv();

Object.assign(global, { TextDecoder, TextEncoder });
