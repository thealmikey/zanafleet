import React, { useMemo } from 'react';
import { Box, List, ListItem, ListItemText, Typography } from '@mui/material';

export interface GeoPoint {
  id: string;
  lat: number;
  lng: number;
  label?: string;
}

export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface GeoMapProps {
  points: GeoPoint[];
  bounds?: GeoBounds;
  height?: number;
  onMarkerClick?: (id: string) => void;
  ariaLabel?: string;
}

function computeBounds(points: GeoPoint[], padding = 0.01): GeoBounds {
  if (points.length === 0) {
    return { minLat: -1.35, maxLat: -1.25, minLng: 36.75, maxLng: 36.85 };
  }

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  return {
    minLat: minLat - padding,
    maxLat: maxLat + padding,
    minLng: minLng - padding,
    maxLng: maxLng + padding,
  };
}

function projectPoint(
  lat: number,
  lng: number,
  bounds: GeoBounds,
  width: number,
  height: number
): { x: number; y: number } {
  const latRange = bounds.maxLat - bounds.minLat;
  const lngRange = bounds.maxLng - bounds.minLng;

  const x = ((lng - bounds.minLng) / lngRange) * width;
  const y = ((bounds.maxLat - lat) / latRange) * height;

  return { x, y };
}

export function GeoMap({
  points,
  bounds: providedBounds,
  height = 300,
  onMarkerClick,
  ariaLabel = 'Geographic map with markers',
}: GeoMapProps): React.ReactElement {
  const bounds = useMemo(
    () => providedBounds ?? computeBounds(points),
    [providedBounds, points]
  );

  const width = 400;

  const projectedPoints = useMemo(() => {
    return points.map((p) => ({
      ...p,
      ...projectPoint(p.lat, p.lng, bounds, width, height),
    }));
  }, [points, bounds, width, height]);

  return (
    <Box>
      <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
        Map View
      </Typography>

      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-label={ariaLabel}
        role="img"
        style={{ border: '1px solid #ccc', borderRadius: 4, backgroundColor: '#f5f5f5' }}
      >
        {projectedPoints.map((p) => (
          <g key={p.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={8}
              fill="#1976d2"
              stroke="#fff"
              strokeWidth={2}
              style={{ cursor: onMarkerClick ? 'pointer' : 'default' }}
              onClick={() => onMarkerClick?.(p.id)}
              aria-label={p.label ?? p.id}
              role="button"
              tabIndex={onMarkerClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (onMarkerClick && (e.key === 'Enter' || e.key === ' ')) {
                  onMarkerClick(p.id);
                }
              }}
            />
            {p.label && (
              <text
                x={p.x + 12}
                y={p.y + 4}
                fontSize={10}
                fill="#333"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        Coordinates
      </Typography>
      <List dense role="list">
        {points.map((p) => (
          <ListItem key={p.id} disablePadding>
            <ListItemText
              primary={p.label ?? p.id}
              secondary={`Lat: ${p.lat.toFixed(4)}, Lng: ${p.lng.toFixed(4)}`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
