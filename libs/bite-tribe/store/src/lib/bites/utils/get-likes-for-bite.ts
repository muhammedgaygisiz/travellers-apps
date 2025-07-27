import { Bite, Like } from 'model';

export const getLikesForBite = (likes: Like[] | undefined, bite: Bite) =>
  likes?.filter((like) => bite.id === like.biteId) || [];
