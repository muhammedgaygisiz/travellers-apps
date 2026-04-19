import { BiteTrailRating } from './bite-trail-rating';

export const isBiteTrailRating = (data: unknown): data is BiteTrailRating => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const rating = (data as { rating?: unknown }).rating;
  const review = (data as { review?: unknown }).review;

  return (
    typeof rating === 'number' &&
    rating >= 1 &&
    rating <= 5 &&
    typeof review === 'string'
  );
};
