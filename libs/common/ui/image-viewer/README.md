# image-viewer

Full-screen photo viewer with pinch and double-tap zoom, panning while zoomed,
and horizontal swipe paging between photos.

The component is presentational: it renders the viewer, it does not present
itself. Consumers wrap it in an `ion-modal` so the platform owns presentation,
focus trapping, and hardware back.

## Running unit tests

Run `nx test image-viewer` to execute the unit tests.
