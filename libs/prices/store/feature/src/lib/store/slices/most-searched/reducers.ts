import {createReducer} from "@ngrx/store";

const initialState = [{
  src: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Aroma_%28apple%29.jpg',
  name: 'Apples',
  price: 0.2
}, {
  src: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Assortment_of_pears.jpg',
  name: 'Bears',
  price: 0.2
}, {
  src: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Autumn_Red_peaches.jpg',
  name: 'Peaches',
  price: 0.2
}];

export const reducers = createReducer(initialState);
