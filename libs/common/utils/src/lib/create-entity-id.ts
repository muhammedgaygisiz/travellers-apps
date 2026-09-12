import { v4 as uuidv4 } from 'uuid';

/**
 * One identifier for something that lives inside a document rather than as one.
 *
 * A Firestore document gets its id from the collection it is created in. The
 * things this is for have no collection: a menu category, a menu item and its
 * variants are nested arrays inside one menu document (issue #1099), so nothing
 * allocates an id for them and the client has to make one.
 *
 * A v4 UUID, which is what `uploadBlobToFirebaseStorage` and the admin image
 * migration already use for the same reason. It carries no meaning - not the
 * name, not the position, not the moment it was made - because anything it
 * carried would be a second copy of a fact the entity already holds, free to
 * disagree with it the moment somebody edits the original.
 */
export const createEntityId = (): string => uuidv4();
