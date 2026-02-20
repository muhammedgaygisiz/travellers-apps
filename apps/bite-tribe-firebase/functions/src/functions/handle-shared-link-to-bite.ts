import { onRequest } from 'firebase-functions/https';
import { Bite } from './model/bite';
import * as admin from 'firebase-admin';
import { renderHtml } from './utils/render-html';

const db = admin.firestore();

export const handleSharedLinkToBite = onRequest(async (req, res) => {
  try {
    // Expected: /s/bite/<id>
    const parts = req.path.split('/').filter(Boolean); // ["s", "bite", "<id>"]
    if (parts.length < 3 || parts[0] !== 's' || parts[1] !== 'bite') {
      res.status(404).send('Not Found');
      return;
    }

    const biteId = parts[2];
    const snap = await db.doc(`/bites/${biteId}`).get();
    if (!snap.exists) {
      res.status(404).send('Not Found');
      return;
    }

    const bite = (snap.data() ?? {}) as Bite;

    // ---- SANITIZE: expose only fields that are ok to be public ----
    const name = bite.name ?? 'A Bite';
    const restaurant = bite.place ?? '';
    const price = bite.price ?? undefined;
    const currency = bite.currency ?? undefined;
    const rating = bite.rating ?? undefined;

    const title = restaurant ? `${name} @ ${restaurant}` : name;

    const descParts = [];
    if (price) {
      descParts.push(`${currency} ${price}`);
    }

    if (rating) {
      descParts.push(`⭐️ ${rating}`);
    }

    const description = descParts.length
      ? descParts.join(' · ')
      : 'Shared from BiteTribe';

    const imageUrl = bite.imagePath;

    const canonicalUrl = `https://bite-tribe.web.app/s/bite/${encodeURIComponent(biteId)}`;
    const redirectUrl = `https://bite-tribe.web.app/bite/${encodeURIComponent(biteId)}`;

    res.status(200).send(
      renderHtml({
        title,
        description,
        imageUrl,
        canonicalUrl,
        redirectUrl,
      }),
    );
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
