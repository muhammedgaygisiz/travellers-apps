import {createEntityAdapter} from "@ngrx/entity";
import { MostSearchedItem } from "./model";

export const adapter = createEntityAdapter<MostSearchedItem>();

// TODO: Switch back to adapter.getInitialState and remove this construct when moved further to effects
export const initialState = adapter.addMany([{
  id: "1",
  src: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Aroma_%28apple%29.jpg',
  name: 'Apples',
  price: 0.2
}, {
  id: "2",
  src: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Assortment_of_pears.jpg',
  name: 'Bears',
  price: 0.2
}, {
  id: "3",
  src: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Autumn_Red_peaches.jpg',
  name: 'Peaches',
  price: 0.2
}], adapter.getInitialState());
