import React from 'react';
import { Grid } from '@mui/material';

import { MetricsCard, MetricsCardProps } from './MetricsCard';

export type KPIGridItem = Omit<MetricsCardProps, 'ariaLabel'>;

export interface KPIGridProps {
  items: KPIGridItem[];
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  getAriaLabel?: (idx: number, item: KPIGridItem) => string;
}

export function KPIGrid({
  items,
  xs = 12,
  sm = 6,
  md = 4,
  lg = 3,
  getAriaLabel,
}: KPIGridProps): React.ReactElement {
  return (
    <Grid container spacing={3}>
      {items.map((item, idx) => (
        <Grid item xs={xs} sm={sm} md={md} lg={lg} key={idx}>
          <MetricsCard
            {...item}
            ariaLabel={getAriaLabel ? getAriaLabel(idx, item) : undefined}
          />
        </Grid>
      ))}
    </Grid>
  );
}
