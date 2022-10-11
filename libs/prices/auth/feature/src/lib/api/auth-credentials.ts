import { FormControl } from '@angular/forms';

export interface AuthCredentials {
  email: FormControl<string | null>;
  password: FormControl<string | null>;
}
