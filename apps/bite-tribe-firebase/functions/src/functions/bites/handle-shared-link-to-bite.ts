import { onRequest } from 'firebase-functions/https';
import { Bite } from '../shared/model/bite';
import { getFirestore } from 'firebase-admin/firestore';
import { renderHtml } from '../shared/utils/render-html';
import { BITE_TRIBE_ORIGIN } from '../shared/utils/bite-tribe-origin';

const db = getFirestore();

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

    // Both built from the canonical host (GitHub issue #345). A share page
    // reached on `bite-tribe.web.app` therefore declares its canonical on
    // `bitetribe.app` and hands the reader on to it, which is what issue #1454
    // wanted and could not do while the verified App Link host was the other
    // one. The function still answers on every host it always did.
    const canonicalUrl = `${BITE_TRIBE_ORIGIN}/s/bite/${encodeURIComponent(biteId)}`;
    const redirectUrl = `${BITE_TRIBE_ORIGIN}/bite/${encodeURIComponent(biteId)}`;

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
