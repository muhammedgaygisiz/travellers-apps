import { Component, output } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { CardComponent } from 'common/ui/card';
import {
  IonButton,
  IonCardHeader,
  IonCardSubtitle,
  IonInput,
  IonItem,
} from '@ionic/angular/standalone';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Bank } from '../api/bank';

interface BankForm {
  name: FormControl<string | null>;
}

@Component({
  selector: 'finances-add-bank',
  imports: [
    PageComponent,
    CardComponent,
    IonItem,
    IonInput,
    IonButton,
    IonCardHeader,
    IonCardSubtitle,
    ReactiveFormsModule,
  ],
  templateUrl: './add-bank.component.html',
  styleUrl: './add-bank.component.scss',
})
export class AddBankComponent {
  submitNewBank = output<Bank>();

  addBankFormGroup: FormGroup = new FormGroup<BankForm>({
    name: new FormControl<string>('', Validators.required),
  });
}
