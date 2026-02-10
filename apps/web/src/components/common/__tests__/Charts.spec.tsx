import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

import {
  LineChart,
  BarChart,
  DoughnutChart,
  sampleEarningsTrend,
  sampleDeliveryVolumes,
  sampleSettlementStatusBreakdown,
} from '../Charts';

jest.mock('react-chartjs-2', () => ({
  Line: (props: any) => <canvas data-testid="mock-line" {...props} />,
  Bar: (props: any) => <canvas data-testid="mock-bar" {...props} />,
  Doughnut: (props: any) => <canvas data-testid="mock-doughnut" {...props} />,
}));

const theme = createTheme();

function renderWithTheme(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ width: 400, height: 300 }}>{ui}</div>
    </ThemeProvider>
  );
}

describe('Charts', () => {
  describe('LineChart', () => {
    it('renders with sample data', () => {
      const { container } = renderWithTheme(
        <LineChart data={sampleEarningsTrend(theme.palette)} height={200} />
      );

      expect(container.querySelector('canvas')).toBeInTheDocument();
      expect(screen.getByTestId('mock-line')).toBeInTheDocument();
    });

    it('has correct aria-label', () => {
      renderWithTheme(
        <LineChart
          data={sampleEarningsTrend(theme.palette)}
          height={200}
          ariaLabel="Custom line chart"
        />
      );

      expect(screen.getByRole('img', { name: 'Custom line chart' })).toBeInTheDocument();
    });

    it('uses default aria-label when not provided', () => {
      renderWithTheme(<LineChart data={sampleEarningsTrend(theme.palette)} height={200} />);

      expect(screen.getByRole('img', { name: 'Line chart' })).toBeInTheDocument();
    });

    it('has correct test id', () => {
      renderWithTheme(<LineChart data={sampleEarningsTrend(theme.palette)} height={200} />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('BarChart', () => {
    it('renders with sample data', () => {
      const { container } = renderWithTheme(
        <BarChart data={sampleDeliveryVolumes(theme.palette)} height={200} />
      );

      expect(container.querySelector('canvas')).toBeInTheDocument();
      expect(screen.getByTestId('mock-bar')).toBeInTheDocument();
    });

    it('has correct aria-label', () => {
      renderWithTheme(
        <BarChart
          data={sampleDeliveryVolumes(theme.palette)}
          height={200}
          ariaLabel="Custom bar chart"
        />
      );

      expect(screen.getByRole('img', { name: 'Custom bar chart' })).toBeInTheDocument();
    });

    it('uses default aria-label when not provided', () => {
      renderWithTheme(<BarChart data={sampleDeliveryVolumes(theme.palette)} height={200} />);

      expect(screen.getByRole('img', { name: 'Bar chart' })).toBeInTheDocument();
    });

    it('has correct test id', () => {
      renderWithTheme(<BarChart data={sampleDeliveryVolumes(theme.palette)} height={200} />);

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  describe('DoughnutChart', () => {
    it('renders with sample data', () => {
      const { container } = renderWithTheme(
        <DoughnutChart data={sampleSettlementStatusBreakdown(theme.palette)} height={200} />
      );

      expect(container.querySelector('canvas')).toBeInTheDocument();
      expect(screen.getByTestId('mock-doughnut')).toBeInTheDocument();
    });

    it('has correct aria-label', () => {
      renderWithTheme(
        <DoughnutChart
          data={sampleSettlementStatusBreakdown(theme.palette)}
          height={200}
          ariaLabel="Custom doughnut chart"
        />
      );

      expect(screen.getByRole('img', { name: 'Custom doughnut chart' })).toBeInTheDocument();
    });

    it('uses default aria-label when not provided', () => {
      renderWithTheme(
        <DoughnutChart data={sampleSettlementStatusBreakdown(theme.palette)} height={200} />
      );

      expect(screen.getByRole('img', { name: 'Doughnut chart' })).toBeInTheDocument();
    });

    it('has correct test id', () => {
      renderWithTheme(
        <DoughnutChart data={sampleSettlementStatusBreakdown(theme.palette)} height={200} />
      );

      expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
    });
  });

  describe('Sample data creators', () => {
    it('sampleEarningsTrend returns valid chart data', () => {
      const data = sampleEarningsTrend(theme.palette);

      expect(data.labels).toHaveLength(12);
      expect(data.datasets).toHaveLength(1);
      expect(data.datasets[0].data).toHaveLength(12);
      expect(data.datasets[0].borderColor).toBe(theme.palette.primary.main);
      expect(data.datasets[0].backgroundColor).toBe(theme.palette.primary.light);
      expect(data.datasets[0].fill).toBe(true);
      expect(data.datasets[0].tension).toBe(0.25);
      expect(data.datasets[0].pointRadius).toBe(2);
    });

    it('sampleDeliveryVolumes returns valid chart data', () => {
      const data = sampleDeliveryVolumes(theme.palette);

      expect(data.labels).toHaveLength(7);
      expect(data.datasets).toHaveLength(1);
      expect(data.datasets[0].data).toHaveLength(7);
      expect(data.datasets[0].backgroundColor).toBe(theme.palette.secondary.main);
      expect(data.datasets[0].borderRadius).toBe(4);
    });

    it('sampleSettlementStatusBreakdown returns valid chart data', () => {
      const data = sampleSettlementStatusBreakdown(theme.palette);

      expect(data.labels).toHaveLength(3);
      expect(data.labels).toEqual(['Completed', 'Processing', 'Pending']);
      expect(data.datasets).toHaveLength(1);
      expect(data.datasets[0].data).toHaveLength(3);
      expect(data.datasets[0].backgroundColor).toHaveLength(3);
      expect(data.datasets[0].borderColor).toHaveLength(3);
    });
  });
});
