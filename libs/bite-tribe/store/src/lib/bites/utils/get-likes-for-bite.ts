import { Bite, Like } from 'model';

export const getLikesForBite = (
  likes: Like[] | undefined,
  bite: Bite
): Like[] => likes?.filter((like) => bite.id === like.biteId) || [];
