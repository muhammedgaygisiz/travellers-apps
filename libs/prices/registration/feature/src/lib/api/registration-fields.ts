import { FormControl } from '@angular/forms';

export interface RegistrationFields {
  email: FormControl<string | null>;
  password: FormControl<string | null>;
  passwordConfirm: FormControl<string | null>;
}
