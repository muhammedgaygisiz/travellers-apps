export interface PublicUser {
  displayName: string;
  email: string;
  photoUrl: string;
  userId: string;
  city?: string;
  about?: string;
  public?: boolean;
}
