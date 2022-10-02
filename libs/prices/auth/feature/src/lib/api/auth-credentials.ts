import { FormControl } from '@angular/forms';

export interface AuthCredentials {
  username: FormControl<string | null>;
  password: FormControl<string | null>;
}
