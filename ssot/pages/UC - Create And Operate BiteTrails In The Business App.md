# UC - Create And Operate BiteTrails In The Business App

## Status

Supported today and still expanding.

## Goal

Creators and business users can create curated BiteTrail offerings.

## Actors

- Food curator or vlogger
- Business user

## Current Flow

- A business user opens the dashboard.
- The business user creates a BiteTrail.
- BiteTrail becomes available as a marketplace-related journey.

## Supported Evidence

- Business `:organisationId/dashboard`
- Business `:organisationId/create-bite-trail`

Both routes still carry the `:organisationId` parameter name and are no longer reachable from the business dashboard, which lost its Organisations list when the unwritten organisation fields were removed in [[issue-1371]]. The parameter is a user id. Renaming it belongs to the business-app rework, not to that cleanup.

## Related GitHub Scope

- Issue \#266 includes assigned users, BiteTrail creation from selected Bites, free BiteTrail access, and marketplace listing.

## Related Domains

- [[Bite Trail]]
- [[Market Place]]
- [[Bite]]
- [[User]]
