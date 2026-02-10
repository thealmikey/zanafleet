import React from 'react';
import { Box, Tab, Tabs } from '@mui/material';

export interface TabDefinition {
  label: string;
  value: string;
  ariaLabel?: string;
}

export interface TabContainerProps {
  tabs: TabDefinition[];
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

interface TabPanelProps {
  children?: React.ReactNode;
  value: string;
  currentValue: string;
  tabId: string;
}

function TabPanel({ children, value, currentValue, tabId }: TabPanelProps): React.ReactElement | null {
  const isActive = value === currentValue;

  return (
    <div
      role="tabpanel"
      hidden={!isActive}
      id={`tabpanel-${value}`}
      aria-labelledby={tabId}
    >
      {isActive && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export function TabContainer({
  tabs,
  value,
  onChange,
  children,
}: TabContainerProps): React.ReactElement {
  const handleChange = (_event: React.SyntheticEvent, newValue: string): void => {
    onChange(newValue);
  };

  const childrenArray = React.Children.toArray(children);

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="Tab navigation"
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.value}
              label={tab.label}
              value={tab.value}
              id={`tab-${tab.value}`}
              aria-controls={`tabpanel-${tab.value}`}
              aria-label={tab.ariaLabel}
            />
          ))}
        </Tabs>
      </Box>
      {tabs.map((tab, index) => (
        <TabPanel
          key={tab.value}
          value={tab.value}
          currentValue={value}
          tabId={`tab-${tab.value}`}
        >
          {childrenArray[index]}
        </TabPanel>
      ))}
    </Box>
  );
}
