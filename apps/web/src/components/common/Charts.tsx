import React from 'react';
import { useTheme, Theme } from '@mui/material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

function mergeDeep<T>(target: any, source: any): T {
  if (source === null || source === undefined) {
    return target;
  }
  if (target === null || target === undefined) {
    return source;
  }
  if (Array.isArray(source)) {
    return source as T;
  }
  if (typeof source !== 'object' || typeof target !== 'object') {
    return source;
  }

  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (Array.isArray(sourceValue)) {
      result[key] = sourceValue;
    } else if (typeof sourceValue === 'object' && sourceValue !== null) {
      result[key] = mergeDeep(targetValue ?? {}, sourceValue);
    } else {
      result[key] = sourceValue;
    }
  }
  return result as T;
}

function buildDefaults(theme: Theme): ChartOptions {
  const textColor = theme.palette.text.secondary;
  const gridColor = theme.palette.divider;

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: textColor,
        },
      },
      title: {
        color: theme.palette.text.primary,
      },
    },
    scales: {
      x: {
        ticks: {
          color: textColor,
        },
        grid: {
          color: gridColor,
        },
      },
      y: {
        ticks: {
          color: textColor,
        },
        grid: {
          color: gridColor,
        },
      },
    },
  };
}

export interface BaseChartProps {
  data: ChartData<any>;
  options?: ChartOptions;
  height?: number;
  ariaLabel?: string;
}

export function LineChart({
  data,
  options,
  height,
  ariaLabel,
}: BaseChartProps): React.ReactElement {
  const theme = useTheme();
  const mergedOptions = mergeDeep<ChartOptions>(buildDefaults(theme), options ?? {});

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? 'Line chart'}
      style={{ height: height ?? 240 }}
      data-testid="line-chart"
    >
      <Line data={data} options={mergedOptions} />
    </div>
  );
}

export function BarChart({
  data,
  options,
  height,
  ariaLabel,
}: BaseChartProps): React.ReactElement {
  const theme = useTheme();
  const mergedOptions = mergeDeep<ChartOptions>(buildDefaults(theme), options ?? {});

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? 'Bar chart'}
      style={{ height: height ?? 240 }}
      data-testid="bar-chart"
    >
      <Bar data={data} options={mergedOptions} />
    </div>
  );
}

export function DoughnutChart({
  data,
  options,
  height,
  ariaLabel,
}: BaseChartProps): React.ReactElement {
  const theme = useTheme();
  const defaultOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: theme.palette.text.secondary,
        },
      },
      title: {
        color: theme.palette.text.primary,
      },
    },
  };
  const mergedOptions = mergeDeep<ChartOptions>(defaultOptions, options ?? {});

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? 'Doughnut chart'}
      style={{ height: height ?? 240 }}
      data-testid="doughnut-chart"
    >
      <Doughnut data={data} options={mergedOptions} />
    </div>
  );
}

export function sampleEarningsTrend(palette: Theme['palette']): ChartData<'line'> {
  return {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Earnings',
        data: [12000, 19000, 15000, 22000, 18000, 24000, 28000, 26000, 30000, 32000, 35000, 40000],
        borderColor: palette.primary.main,
        backgroundColor: palette.primary.light,
        fill: true,
        tension: 0.25,
        pointRadius: 2,
      },
    ],
  };
}

export function sampleDeliveryVolumes(palette: Theme['palette']): ChartData<'bar'> {
  return {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Deliveries',
        data: [65, 78, 90, 81, 95, 55, 40],
        backgroundColor: palette.secondary.main,
        borderRadius: 4,
      },
    ],
  };
}

export function sampleSettlementStatusBreakdown(palette: Theme['palette']): ChartData<'doughnut'> {
  return {
    labels: ['Completed', 'Processing', 'Pending'],
    datasets: [
      {
        label: 'Settlements',
        data: [65, 20, 15],
        backgroundColor: [
          palette.success.main,
          palette.warning.main,
          palette.info?.main ?? palette.error.main,
        ],
        borderColor: [
          palette.success.dark,
          palette.warning.dark,
          palette.info?.dark ?? palette.error.dark,
        ],
        borderWidth: 1,
      },
    ],
  };
}
