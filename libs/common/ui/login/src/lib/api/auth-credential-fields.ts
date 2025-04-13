import { FormControl } from '@angular/forms';

export interface AuthCredentialFields {
  email: FormControl<string | null>;
  password: FormControl<string | null>;
}
