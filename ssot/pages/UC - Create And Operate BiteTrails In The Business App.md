# UC - Create And Operate BiteTrails In The Business App

## Status

Supported today and still expanding.

## Goal

Creators and business users can create curated BiteTrail offerings.

## Actors

- Food curator or vlogger
- Business user

## Current Flow

- A business user opens the dashboard and sees the BiteTrails they own.
- The business user opens Create BiteTrail, picks from their own Bites, and creates the trail.
- BiteTrail becomes available as a marketplace-related journey.

## Supported Evidence

- Business `dashboard`, which lists the signed-in user's BiteTrails and links to creation
- Business `create-bite-trail`

A BiteTrail is owned by the account that creates it. The route takes no owner parameter: the owner is the signed-in user. The organisation dashboard that used to sit in front of this flow is gone, together with its `:organisationId` routes and the "employees" list it was built around - that list read the `organisationId` field on user documents, which nothing ever wrote, so it was always empty and no Bite could be reached through it. See [[issue-1371]].

## Related GitHub Scope

- Issue \#266 includes assigned users, BiteTrail creation from selected Bites, free BiteTrail access, and marketplace listing.

## Related Domains

- [[Bite Trail]]
- [[Market Place]]
- [[Bite]]
- [[User]]
