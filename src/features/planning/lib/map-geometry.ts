import type { LatLng } from '../types';

/**
 * Hand-traced base geography for the demo map, stored in real coordinates so
 * it projects with the same transform as the markers. It is an illustration of
 * Phnom Penh, not survey data — enough for the manager to orient by the river.
 */

export interface MapFeature {
  id: string;
  points: LatLng[];
  width: number;
}

const pt = (lat: number, lng: number): LatLng => ({ lat, lng });

/** Tonle Sap, Mekong and Bassac meeting at Chaktomuk. */
export const RIVERS: MapFeature[] = [
  {
    id: 'tonle-sap',
    width: 3.2,
    points: [pt(11.72, 104.868), pt(11.665, 104.892), pt(11.618, 104.912), pt(11.585, 104.927), pt(11.566, 104.937)],
  },
  {
    id: 'mekong-north',
    width: 4.2,
    points: [pt(11.745, 105.02), pt(11.688, 104.995), pt(11.638, 104.968), pt(11.598, 104.951), pt(11.566, 104.937)],
  },
  {
    id: 'mekong-south',
    width: 4.0,
    points: [pt(11.566, 104.937), pt(11.535, 104.958), pt(11.494, 104.982), pt(11.44, 105.012)],
  },
  {
    id: 'bassac',
    width: 2.6,
    points: [pt(11.566, 104.937), pt(11.534, 104.928), pt(11.495, 104.918), pt(11.442, 104.906)],
  },
];

/** Boeung Kak / Boeung Trabek style water bodies, drawn as closed rings. */
export const LAKES: MapFeature[] = [
  {
    id: 'boeung-kak',
    width: 0,
    points: [pt(11.585, 104.902), pt(11.592, 104.909), pt(11.587, 104.918), pt(11.578, 104.914), pt(11.577, 104.905)],
  },
  {
    id: 'boeung-trabek',
    width: 0,
    points: [pt(11.53, 104.923), pt(11.536, 104.932), pt(11.529, 104.939), pt(11.523, 104.932)],
  },
];

/** Arterials — thicker strokes; drawn under the minor grid. */
export const HIGHWAYS: MapFeature[] = [
  // National Road 5 heading north-west
  { id: 'nr5', width: 1.6, points: [pt(11.72, 104.79), pt(11.655, 104.855), pt(11.607, 104.894), pt(11.575, 104.915)] },
  // National Road 6A across the Mekong to Chroy Changvar
  { id: 'nr6a', width: 1.4, points: [pt(11.575, 104.933), pt(11.605, 104.946), pt(11.652, 104.968), pt(11.71, 105.0)] },
  // National Road 1 to the south-east
  { id: 'nr1', width: 1.4, points: [pt(11.545, 104.94), pt(11.52, 104.978), pt(11.492, 105.02), pt(11.462, 105.06)] },
  // National Road 2 to Ta Khmau
  { id: 'nr2', width: 1.4, points: [pt(11.53, 104.92), pt(11.505, 104.928), pt(11.478, 104.942), pt(11.44, 104.955)] },
  // National Road 4 to the west
  { id: 'nr4', width: 1.5, points: [pt(11.552, 104.87), pt(11.535, 104.82), pt(11.512, 104.76), pt(11.49, 104.69)] },
  // Ring road
  {
    id: 'ring',
    width: 1.2,
    points: [
      pt(11.63, 104.86), pt(11.6, 104.842), pt(11.56, 104.838), pt(11.518, 104.855),
      pt(11.492, 104.895), pt(11.492, 104.94), pt(11.512, 104.972),
    ],
  },
];

/** City grid — Monivong, Norodom, Sihanouk, Russian Federation, Mao Tse Toung. */
export const STREETS: MapFeature[] = [
  { id: 'monivong', width: 0.8, points: [pt(11.6, 104.9155), pt(11.5, 104.9155)] },
  { id: 'norodom', width: 0.8, points: [pt(11.598, 104.9235), pt(11.508, 104.9235)] },
  { id: 'sothearos', width: 0.7, points: [pt(11.582, 104.9315), pt(11.52, 104.9315)] },
  { id: 'st-271', width: 0.7, points: [pt(11.6, 104.888), pt(11.556, 104.885), pt(11.522, 104.897), pt(11.505, 104.928)] },
  { id: 'sihanouk', width: 0.8, points: [pt(11.5485, 104.898), pt(11.5485, 104.938)] },
  { id: 'mao-tse-toung', width: 0.8, points: [pt(11.536, 104.895), pt(11.5355, 104.945)] },
  { id: 'russian', width: 0.9, points: [pt(11.566, 104.856), pt(11.5665, 104.918)] },
  { id: 'kampuchea-krom', width: 0.7, points: [pt(11.573, 104.895), pt(11.573, 104.925)] },
  { id: 'charles-de-gaulle', width: 0.7, points: [pt(11.588, 104.874), pt(11.588, 104.912)] },
  { id: 'veng-sreng', width: 0.7, points: [pt(11.52, 104.86), pt(11.5, 104.895), pt(11.494, 104.925)] },
  { id: 'hun-sen', width: 0.7, points: [pt(11.545, 104.9), pt(11.52, 104.912), pt(11.5, 104.936)] },
  { id: 'st-598', width: 0.6, points: [pt(11.63, 104.885), pt(11.6, 104.9), pt(11.585, 104.923)] },
];

/** District labels floated over the base layer at low emphasis. */
export const AREA_LABELS: Array<LatLng & { label: string }> = [
  { lat: 11.588, lng: 104.898, label: 'TUOL KORK' },
  { lat: 11.572, lng: 104.928, label: 'DAUN PENH' },
  { lat: 11.541, lng: 104.921, label: 'CHAMKAR MON' },
  { lat: 11.612, lng: 104.884, label: 'SEN SOK' },
  { lat: 11.512, lng: 104.905, label: 'MEAN CHEY' },
  { lat: 11.63, lng: 104.952, label: 'CHROY CHANGVAR' },
  { lat: 11.526, lng: 104.858, label: 'POU SENCHEY' },
  { lat: 11.482, lng: 104.948, label: 'TA KHMAU' },
];
