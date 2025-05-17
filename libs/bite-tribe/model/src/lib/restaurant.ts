import firebase from 'firebase/compat';
import GeoPoint = firebase.firestore.GeoPoint;

export interface Restaurant {
  id: string;
  name: string;
  distance?: string;
  image?: string;
  position: GeoPoint;

  menuId?: string;

  unsaved?: boolean;
  biteIds?: string[];
}
