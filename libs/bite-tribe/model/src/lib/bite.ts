import firebase from 'firebase/compat';
import GeoPoint = firebase.firestore.GeoPoint;

export interface Bite {
  id: string;
  name: string;
  image: string;
  place: string;
  price: number;
  position: GeoPoint;
  distance?: string;

  likes?: any[];
  thumbup: number;
  drooling: number;
  mindblown: number;

  tags?: string[];
}
