import { useContext } from 'react';

import { SignupWizardContext, SignupWizardContextValue } from '../contexts/SignupWizardContext';

/**
 * Hook to access the SignupWizard context.
 * Must be used within a SignupWizardProvider.
 *
 * @returns The signup wizard state and actions
 * @throws Error if used outside of SignupWizardProvider
 */
export function useSignupWizard(): SignupWizardContextValue {
  const context = useContext(SignupWizardContext);

  if (context === null) {
    throw new Error('useSignupWizard must be used within a SignupWizardProvider');
  }

  return context;
}
