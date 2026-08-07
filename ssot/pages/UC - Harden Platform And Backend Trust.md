# UC - Harden Platform And Backend Trust

## Status

Next to implement.

## Goal

Backend and platform safeguards should protect the reliability of BiteTribe's food graph.

## Actors

- User
- Admin
- Developer

## Target Flow

- App Check, callable backend boundaries, user creation, leaderboard aggregation, search callables, and location queries are production-ready.
- Trust and safety improvements support user-facing discovery reliability.
- A third-party API that App Check cannot reach is protected by the callable in front of it, and the substitute control is documented instead of being implied. Google Places is the worked example: server-side only, App Check enforced and authenticated at the callable, key restricted by API, and monitoring read as expected rather than as an open gap. See [[issue-1245]].

## Related Domains

- [[User]]
- [[Bite]]
- [[Restaurant]]
- [[Market Place]]
