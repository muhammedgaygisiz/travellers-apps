# UC - Inspect Bite Details

## Status

Supported today.

## Goal

Users can inspect one Bite deeply enough to decide whether the dish is relevant.

## Actors

- Food lover
- Traveler
- Bite creator

## Current Flow

- User opens a Bite detail page.
- The page shows the food experience in context.
- A public creator profile identifies who shared the Bite.
- The page shows the Bite's distance from the user's current position and converts its price into the user's preferred currency.
- User can share the Bite through the device share sheet, including WhatsApp when available.
- User can open directions to the Bite's place through the platform navigation experience.
- User can save the Bite to an existing bucket list or create a new list for it.
- User can understand creator/profile context, restaurant/place context, image, likes, reviews, and related data.

## Supported Evidence

- `bite/:biteId`
- Bite details page and data-access.
- Like API.
- Review API.

## Related Domains

- [[Bite]]
- [[User]]
- [[Restaurant]]
