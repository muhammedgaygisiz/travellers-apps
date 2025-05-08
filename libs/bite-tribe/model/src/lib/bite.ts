export interface Bite {
  id: string;
  name: string;
  image: string;
  place: string;
  price: number;

  likes?: any[];
  thumbup: number;
  drooling: number;
  mindblown: number;

  distance?: string;
  tags?: string[];
}
