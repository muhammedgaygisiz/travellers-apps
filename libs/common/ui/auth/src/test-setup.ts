import { TextDecoder, TextEncoder } from 'util';
import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv();

Object.assign(global, { TextDecoder, TextEncoder });
