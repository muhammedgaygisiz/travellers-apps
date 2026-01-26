import { ValidationErrors, ValidatorFn } from '@angular/forms';

export const ImageValidator: ValidatorFn = (fg): ValidationErrors | null => {
  const imageValue = fg.get('image')?.value;
  const imagePathValue = fg.get('imagePath')?.value;

  if (!imageValue && !imagePathValue) {
    return { imageRequired: true };
  }

  return null;
};
