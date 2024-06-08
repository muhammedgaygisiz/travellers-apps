import { FormControl } from '@angular/forms';

export interface AddItem {
  productName: FormControl<string | null>;
  price: FormControl<number | null>;
  image: FormControl;
  location: FormControl<string | null>;
}
