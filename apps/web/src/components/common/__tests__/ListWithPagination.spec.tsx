import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { ListWithPagination } from '../ListWithPagination';

describe('ListWithPagination', () => {
  const mockItems = ['Item 1', 'Item 2', 'Item 3'];
  const mockRenderItem = (item: string): React.ReactNode => <div>{item}</div>;

  it('renders list items', () => {
    render(
      <ListWithPagination
        items={mockItems}
        renderItem={mockRenderItem}
        page={1}
        totalPages={1}
        onPageChange={jest.fn()}
      />
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('renders empty state when no items', () => {
    render(
      <ListWithPagination
        items={[]}
        renderItem={mockRenderItem}
        page={1}
        totalPages={0}
        onPageChange={jest.fn()}
        emptyText="No items found"
      />
    );

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('shows default empty text', () => {
    render(
      <ListWithPagination
        items={[]}
        renderItem={mockRenderItem}
        page={1}
        totalPages={0}
        onPageChange={jest.fn()}
      />
    );

    expect(screen.getByText('No items to display')).toBeInTheDocument();
  });

  it('triggers onPageChange via next button click', () => {
    const handlePageChange = jest.fn();
    render(
      <ListWithPagination
        items={mockItems}
        renderItem={mockRenderItem}
        page={1}
        totalPages={3}
        onPageChange={handlePageChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Next page'));
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('triggers onPageChange via prev button click', () => {
    const handlePageChange = jest.fn();
    render(
      <ListWithPagination
        items={mockItems}
        renderItem={mockRenderItem}
        page={2}
        totalPages={3}
        onPageChange={handlePageChange}
      />
    );

    fireEvent.click(screen.getByLabelText('Previous page'));
    expect(handlePageChange).toHaveBeenCalledWith(1);
  });

  it('disables prev button on first page', () => {
    render(
      <ListWithPagination
        items={mockItems}
        renderItem={mockRenderItem}
        page={1}
        totalPages={3}
        onPageChange={jest.fn()}
      />
    );

    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('First page')).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(
      <ListWithPagination
        items={mockItems}
        renderItem={mockRenderItem}
        page={3}
        totalPages={3}
        onPageChange={jest.fn()}
      />
    );

    expect(screen.getByLabelText('Next page')).toBeDisabled();
    expect(screen.getByLabelText('Last page')).toBeDisabled();
  });

  it('shows loading spinner when loading', () => {
    render(
      <ListWithPagination
        items={mockItems}
        renderItem={mockRenderItem}
        page={1}
        totalPages={1}
        onPageChange={jest.fn()}
        loading
      />
    );

    expect(screen.getByLabelText('Loading list')).toBeInTheDocument();
  });

  it('displays page info with total', () => {
    render(
      <ListWithPagination
        items={mockItems}
        renderItem={mockRenderItem}
        page={2}
        totalPages={5}
        total={25}
        onPageChange={jest.fn()}
      />
    );

    expect(screen.getByText('Page 2 of 5 (25 total)')).toBeInTheDocument();
  });
});
