import L from 'leaflet';
import 'leaflet.markercluster';

/**
 * Puts the markers on the map in one layer and returns it, so the next update
 * can remove them together.
 *
 * A route shows every stop: its markers go into a plain group, because the
 * cluster group folds markers at the same coordinates into one bubble even
 * with a cluster radius of 0, and two Bites at one restaurant would hide each
 * other's numbers (issue #2355). Everything else keeps the cluster group.
 */
export const addMarkerLayer = (
  markers: L.Marker[],
  map: L.Map,
  options: { clusterMarkers: boolean; showRoute: boolean },
): L.LayerGroup =>
  options.showRoute
    ? L.featureGroup(markers).addTo(map)
    : L.markerClusterGroup(
        options.clusterMarkers ? undefined : { maxClusterRadius: 0 },
      )
        .addLayers(markers)
        .addTo(map);
