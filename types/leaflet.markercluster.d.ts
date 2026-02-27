// types/leaflet.markercluster.d.ts
// Déclarations de types pour leaflet.markercluster

import * as L from 'leaflet';

declare module 'leaflet' {
  interface MarkerClusterGroupOptions {
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
    spiderfyOnMaxZoom?: boolean;
    removeOutsideVisibleBounds?: boolean;
    animate?: boolean;
    animateAddingMarkers?: boolean;
    disableClusteringAtZoom?: number;
    maxClusterRadius?: number | ((zoom: number) => number);
    polygonOptions?: L.PolylineOptions;
    singleMarkerMode?: boolean;
    spiderLegPolylineOptions?: L.PolylineOptions;
    spiderfyDistanceMultiplier?: number;
    iconCreateFunction?: (cluster: L.MarkerCluster) => L.Icon | L.DivIcon;
    clusterPane?: string;
    chunkedLoading?: boolean;
    chunkInterval?: number;
    chunkDelay?: number;
    chunkProgress?: (processed: number, total: number, elapsed: number) => void;
  }

  interface MarkerCluster extends Marker {
    getChildCount(): number;
    getAllChildMarkers(): Marker[];
    zoomToBounds(options?: L.FitBoundsOptions): void;
  }

  interface MarkerClusterGroup extends FeatureGroup {
    addLayer(layer: Layer): this;
    removeLayer(layer: Layer): this;
    clearLayers(): this;
    getVisibleParent(marker: Marker): Marker;
    refreshClusters(clusters?: Marker[] | Marker): this;
    getChildCount(): number;
    getAllChildMarkers(): Marker[];
    hasLayer(layer: Layer): boolean;
    zoomToShowLayer(layer: Layer, callback?: () => void): void;
  }

  function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup;
}
