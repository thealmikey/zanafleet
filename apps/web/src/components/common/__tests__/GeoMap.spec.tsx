import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { GeoMap } from '../GeoMap';
import type { GeoPoint } from '../GeoMap';

describe('GeoMap', () => {
  const mockPoints: GeoPoint[] = [
    { id: 'p1', lat: -1.2864, lng: 36.8172, label: 'Point A' },
    { id: 'p2', lat: -1.2673, lng: 36.8110, label: 'Point B' },
    { id: 'p3', lat: -1.2891, lng: 36.7832 },
  ];

  it('renders SVG with markers count matching input', () => {
    render(<GeoMap points={mockPoints} />);

    const circles = screen.getAllByRole('button');
    expect(circles).toHaveLength(3);
  });

  it('has aria-label present on SVG', () => {
    render(<GeoMap points={mockPoints} ariaLabel="Test map" />);

    expect(screen.getByLabelText('Test map')).toBeInTheDocument();
  });

  it('uses default aria-label when not provided', () => {
    render(<GeoMap points={mockPoints} />);

    expect(screen.getByLabelText('Geographic map with markers')).toBeInTheDocument();
  });

  it('renders list of coordinates', () => {
    render(<GeoMap points={mockPoints} />);

    expect(screen.getByText('Coordinates')).toBeInTheDocument();
    expect(screen.getByText('Point A')).toBeInTheDocument();
    expect(screen.getByText('Point B')).toBeInTheDocument();
  });

  it('renders coordinate values in list', () => {
    render(<GeoMap points={mockPoints} />);

    expect(screen.getByText(/Lat: -1.2864/)).toBeInTheDocument();
    expect(screen.getByText(/Lng: 36.8172/)).toBeInTheDocument();
  });

  it('calls onMarkerClick when marker is clicked', () => {
    const handleClick = jest.fn();
    render(<GeoMap points={mockPoints} onMarkerClick={handleClick} />);

    const markers = screen.getAllByRole('button');
    fireEvent.click(markers[0]);

    expect(handleClick).toHaveBeenCalledWith('p1');
  });

  it('calls onMarkerClick on Enter key', () => {
    const handleClick = jest.fn();
    render(<GeoMap points={mockPoints} onMarkerClick={handleClick} />);

    const markers = screen.getAllByRole('button');
    fireEvent.keyDown(markers[1], { key: 'Enter' });

    expect(handleClick).toHaveBeenCalledWith('p2');
  });

  it('renders Map View header', () => {
    render(<GeoMap points={mockPoints} />);

    expect(screen.getByRole('heading', { name: 'Map View' })).toBeInTheDocument();
  });

  it('renders with empty points array', () => {
    render(<GeoMap points={[]} />);

    expect(screen.getByLabelText('Geographic map with markers')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('uses custom bounds when provided', () => {
    const customBounds = {
      minLat: -2.0,
      maxLat: -1.0,
      minLng: 36.0,
      maxLng: 37.0,
    };

    render(<GeoMap points={mockPoints} bounds={customBounds} />);

    expect(screen.getByLabelText('Geographic map with markers')).toBeInTheDocument();
  });
});
