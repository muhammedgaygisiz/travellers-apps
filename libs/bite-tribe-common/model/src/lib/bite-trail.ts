export interface BiteTrail {
  id: string;
  ownerId: string;
  name: string;
  biteIds: string[];
  soldCount?: number;
  image?: string;
  /**
   * The published photo. Written only by `setBiteTrailImagePathOnUpload`,
   * once the image check passed it (GitHub issue #2141).
   */
  imagePath: string;
  /**
   * Where the photo being uploaded has got to (GitHub issue #2141), as on a
   * restaurant. `imagePath` keeps the previous photo while it is `pending`
   * and when it is `refused`. Absent on a trail created without a photo.
   */
  imageStatus?: 'pending' | 'uploaded' | 'failed' | 'refused';
  /** Why the image check refused the photo, while `imageStatus` is `refused`. */
  imageRefusalCategory?: string;
  ownerImagePath: string;
  ownerName: string;
  location: string;
  description: string;
  price: number;
  currency: string;

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}
