import {FormControl} from "@angular/forms";

export interface Price {
  productName: FormControl<string | null>;
  price: FormControl<number | null>;
  location: FormControl<string | null>;
}
