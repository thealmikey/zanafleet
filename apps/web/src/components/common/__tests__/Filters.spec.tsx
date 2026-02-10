import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { Filters } from '../Filters';

describe('Filters', () => {
  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Pending', value: 'pending' },
  ];

  it('renders all labeled inputs', () => {
    render(
      <Filters
        statusOptions={statusOptions}
        onChange={jest.fn()}
      />
    );

    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Radius (meters)')).toBeInTheDocument();
    expect(screen.getByLabelText('Limit')).toBeInTheDocument();
  });

  it('updates onChange when user types in start date', () => {
    const handleChange = jest.fn();
    render(<Filters onChange={handleChange} />);

    fireEvent.change(screen.getByLabelText('Start Date'), {
      target: { value: '2024-01-15' },
    });

    expect(handleChange).toHaveBeenCalledWith({ startDate: '2024-01-15' });
  });

  it('updates onChange when user types in end date', () => {
    const handleChange = jest.fn();
    render(<Filters onChange={handleChange} />);

    fireEvent.change(screen.getByLabelText('End Date'), {
      target: { value: '2024-01-20' },
    });

    expect(handleChange).toHaveBeenCalledWith({ endDate: '2024-01-20' });
  });

  it('updates onChange when user types radius', () => {
    const handleChange = jest.fn();
    render(<Filters onChange={handleChange} />);

    fireEvent.change(screen.getByLabelText('Radius (meters)'), {
      target: { value: '5000' },
    });

    expect(handleChange).toHaveBeenCalledWith({ radius: 5000 });
  });

  it('updates onChange when user types limit', () => {
    const handleChange = jest.fn();
    render(<Filters onChange={handleChange} />);

    fireEvent.change(screen.getByLabelText('Limit'), {
      target: { value: '50' },
    });

    expect(handleChange).toHaveBeenCalledWith({ limit: 50 });
  });

  it('calls onApply when Apply button is clicked', () => {
    const handleApply = jest.fn();
    render(<Filters onChange={jest.fn()} onApply={handleApply} />);

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(handleApply).toHaveBeenCalled();
  });

  it('calls onClear when Clear button is clicked', () => {
    const handleClear = jest.fn();
    const handleChange = jest.fn();
    render(<Filters onChange={handleChange} onClear={handleClear} />);

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(handleClear).toHaveBeenCalled();
    expect(handleChange).toHaveBeenCalledWith({
      startDate: undefined,
      endDate: undefined,
      status: undefined,
      radius: undefined,
      limit: undefined,
    });
  });

  it('renders custom title', () => {
    render(<Filters onChange={jest.fn()} title="Custom Filters" />);

    expect(screen.getByRole('heading', { name: 'Custom Filters' })).toBeInTheDocument();
  });

  it('can collapse and expand', () => {
    render(<Filters onChange={jest.fn()} />);

    const collapseButton = screen.getByLabelText('Collapse filters');
    fireEvent.click(collapseButton);

    expect(screen.getByLabelText('Expand filters')).toBeInTheDocument();
  });

  it('starts collapsed when collapsedByDefault is true', () => {
    render(<Filters onChange={jest.fn()} collapsedByDefault />);

    expect(screen.getByLabelText('Expand filters')).toBeInTheDocument();
  });
});
