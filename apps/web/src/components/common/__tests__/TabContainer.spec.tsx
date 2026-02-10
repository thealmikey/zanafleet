import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { TabContainer } from '../TabContainer';

describe('TabContainer', () => {
  const tabs = [
    { label: 'Tab 1', value: 'tab1' },
    { label: 'Tab 2', value: 'tab2' },
    { label: 'Tab 3', value: 'tab3', ariaLabel: 'Third tab' },
  ];

  it('renders all tabs', () => {
    render(
      <TabContainer tabs={tabs} value="tab1" onChange={jest.fn()}>
        <div>Content 1</div>
        <div>Content 2</div>
        <div>Content 3</div>
      </TabContainer>
    );

    expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Third tab' })).toBeInTheDocument();
  });

  it('renders correct panel content for selected tab', () => {
    render(
      <TabContainer tabs={tabs} value="tab1" onChange={jest.fn()}>
        <div>Content 1</div>
        <div>Content 2</div>
        <div>Content 3</div>
      </TabContainer>
    );

    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
  });

  it('calls onChange when tab is clicked', () => {
    const handleChange = jest.fn();
    render(
      <TabContainer tabs={tabs} value="tab1" onChange={handleChange}>
        <div>Content 1</div>
        <div>Content 2</div>
        <div>Content 3</div>
      </TabContainer>
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));
    expect(handleChange).toHaveBeenCalledWith('tab2');
  });

  it('shows different content when value changes', () => {
    const { rerender } = render(
      <TabContainer tabs={tabs} value="tab1" onChange={jest.fn()}>
        <div>Content 1</div>
        <div>Content 2</div>
        <div>Content 3</div>
      </TabContainer>
    );

    expect(screen.getByText('Content 1')).toBeInTheDocument();

    rerender(
      <TabContainer tabs={tabs} value="tab2" onChange={jest.fn()}>
        <div>Content 1</div>
        <div>Content 2</div>
        <div>Content 3</div>
      </TabContainer>
    );

    expect(screen.getByText('Content 2')).toBeInTheDocument();
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
  });

  it('has correct tabpanel role', () => {
    render(
      <TabContainer tabs={tabs} value="tab1" onChange={jest.fn()}>
        <div>Content 1</div>
        <div>Content 2</div>
        <div>Content 3</div>
      </TabContainer>
    );

    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });
});
