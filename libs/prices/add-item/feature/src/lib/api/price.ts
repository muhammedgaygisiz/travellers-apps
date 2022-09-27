import { FormControl } from '@angular/forms';

export interface Price {
  productName: FormControl<string | null>;
  price: FormControl<number | null>;
  src: FormControl<string | null>;
  location: FormControl<string | null>;
}
