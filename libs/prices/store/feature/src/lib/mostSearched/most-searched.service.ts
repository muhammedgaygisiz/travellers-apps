import { Observable, of } from 'rxjs';
import { MostSearchedItem } from './index';
import { HttpClient } from '@angular/common/http';

const dummies: MostSearchedItem[] = [
  {
    id: '1',
    src: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Aroma_%28apple%29.jpg',
    name: 'Apples',
    price: 0.2,
  },
  {
    id: '2',
    src: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Assortment_of_pears.jpg',
    name: 'Bears',
    price: 0.2,
  },
  {
    id: '3',
    src: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Autumn_Red_peaches.jpg',
    name: 'Peaches',
    price: 0.2,
  },
];

export class MostSearchedService {
  constructor(private readonly httpClient: HttpClient) {}

  public getAll(): Observable<MostSearchedItem[]> {
    // this.httpClient.get<MostSearchedItem[]>();

    return of(dummies);
  }
}
