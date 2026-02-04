import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonalDetailsStep } from './PersonalDetailsStep';
import { ActorType } from '../../../types';
import { useSignupWizard } from '../../../hooks/useSignupWizard';

// Mock the useSignupWizard hook
jest.mock('../../../hooks/useSignupWizard');

const mockUseSignupWizard = useSignupWizard as jest.MockedFunction<typeof useSignupWizard>;
const mockUpdateField = jest.fn();

function createMockWizardState(overrides = {}): ReturnType<typeof useSignupWizard> {
  return {
    sessionId: 'test-session-id',
    currentStep: 1,
    formData: {
      actorType: null,
      fullName: '',
      nationalId: '',
      location: '',
      businessName: '',
      saccoName: '',
      email: '',
      phone: '',
      password: '',
    },
    completedSteps: [],
    isLoading: false,
    error: null,
    nextStep: jest.fn(),
    prevStep: jest.fn(),
    goToStep: jest.fn(),
    updateField: mockUpdateField,
    initSession: jest.fn(),
    saveProgress: jest.fn(),
    finalize: jest.fn(),
    clearSession: jest.fn(),
    ...overrides,
  };
}

describe('PersonalDetailsStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSignupWizard.mockReturnValue(createMockWizardState());
  });

  describe('Required fields validation', () => {
    it('should show validation error when fullName is empty and touched', async () => {
      const user = userEvent.setup();
      render(<PersonalDetailsStep />);

      const fullNameInput = screen.getByLabelText(/Full Name/i);

      // Touch the field by clicking and then losing focus
      await user.click(fullNameInput);
      fullNameInput.blur();

      await waitFor(() => {
        expect(screen.getByText('Full name is required')).toBeInTheDocument();
      });
    });

    it('should show validation error when nationalId is empty and touched', async () => {
      const user = userEvent.setup();
      render(<PersonalDetailsStep />);

      const nationalIdInput = screen.getByLabelText(/National ID/i);

      await user.click(nationalIdInput);
      nationalIdInput.blur();

      await waitFor(() => {
        expect(screen.getByText('National ID is required')).toBeInTheDocument();
      });
    });

    it('should show validation error when location is empty and touched', async () => {
      const user = userEvent.setup();
      render(<PersonalDetailsStep />);

      const locationInput = screen.getByLabelText(/Location/i);

      await user.click(locationInput);
      locationInput.blur();

      await waitFor(() => {
        expect(screen.getByText('Location is required')).toBeInTheDocument();
      });
    });

    it('should not show validation error when field is not touched', () => {
      render(<PersonalDetailsStep />);

      expect(screen.queryByText('Full name is required')).not.toBeInTheDocument();
      expect(screen.queryByText('National ID is required')).not.toBeInTheDocument();
      expect(screen.queryByText('Location is required')).not.toBeInTheDocument();
    });

    it('should clear validation error when field is populated', async () => {
      const user = userEvent.setup();
      render(<PersonalDetailsStep />);

      const fullNameInput = screen.getByLabelText(/Full Name/i);

      // Touch the field
      await user.click(fullNameInput);
      fullNameInput.blur();

      await waitFor(() => {
        expect(screen.getByText('Full name is required')).toBeInTheDocument();
      });

      // Now populate the field
      mockUseSignupWizard.mockReturnValue(
        createMockWizardState({
          formData: {
            actorType: null,
            fullName: 'John Doe',
            nationalId: '',
            location: '',
            businessName: '',
            saccoId: '',
            email: '',
            phone: '',
            password: '',
          },
        })
      );

      // Re-render
      render(<PersonalDetailsStep />);

      // Validation error should be gone
      expect(screen.queryByText('Full name is required')).not.toBeInTheDocument();
    });
  });

  describe('Conditional field rendering', () => {
    it('should show businessName field when actorType is Business', () => {
      mockUseSignupWizard.mockReturnValue(
        createMockWizardState({
          formData: {
            actorType: ActorType.Business,
            fullName: '',
            nationalId: '',
            location: '',
            businessName: '',
            saccoId: '',
            email: '',
            phone: '',
            password: '',
          },
        })
      );

      render(<PersonalDetailsStep />);

      expect(screen.getByLabelText(/Business Name/i)).toBeInTheDocument();
    });

    it('should show businessName field when actorType is BusinessOwner', () => {
      mockUseSignupWizard.mockReturnValue(
        createMockWizardState({
          formData: {
            actorType: ActorType.BusinessOwner,
            fullName: '',
            nationalId: '',
            location: '',
            businessName: '',
            saccoId: '',
            email: '',
            phone: '',
            password: '',
          },
        })
      );

      render(<PersonalDetailsStep />);

      expect(screen.getByLabelText(/Business Name/i)).toBeInTheDocument();
    });

    it('should NOT show businessName field when actorType is Rider', () => {
      mockUseSignupWizard.mockReturnValue(
        createMockWizardState({
          formData: {
            actorType: ActorType.Rider,
            fullName: '',
            nationalId: '',
            location: '',
            businessName: '',
            saccoId: '',
            email: '',
            phone: '',
            password: '',
          },
        })
      );

      render(<PersonalDetailsStep />);

      expect(screen.queryByLabelText(/Business Name/i)).not.toBeInTheDocument();
    });

    it('should NOT show businessName field when actorType is null', () => {
      mockUseSignupWizard.mockReturnValue(createMockWizardState());

      render(<PersonalDetailsStep />);

      expect(screen.queryByLabelText(/Business Name/i)).not.toBeInTheDocument();
    });

    it('should show saccoName field when actorType is Rider', () => {
      mockUseSignupWizard.mockReturnValue(
        createMockWizardState({
          formData: {
            actorType: ActorType.Rider,
            fullName: '',
            nationalId: '',
            location: '',
            businessName: '',
            saccoName: '',
            email: '',
            phone: '',
            password: '',
          },
        })
      );

      render(<PersonalDetailsStep />);

      expect(screen.getByLabelText(/SACCO Name/i)).toBeInTheDocument();
    });

    it('should NOT show saccoName field when actorType is Business', () => {
      mockUseSignupWizard.mockReturnValue(
        createMockWizardState({
          formData: {
            actorType: ActorType.Business,
            fullName: '',
            nationalId: '',
            location: '',
            businessName: '',
            saccoName: '',
            email: '',
            phone: '',
            password: '',
          },
        })
      );

      render(<PersonalDetailsStep />);

      expect(screen.queryByLabelText(/SACCO Name/i)).not.toBeInTheDocument();
    });

    it('should NOT show saccoName field when actorType is null', () => {
      mockUseSignupWizard.mockReturnValue(createMockWizardState());

      render(<PersonalDetailsStep />);

      expect(screen.queryByLabelText(/SACCO Name/i)).not.toBeInTheDocument();
    });

    it('should show businessName as required for Business actor type', () => {
      mockUseSignupWizard.mockReturnValue(
        createMockWizardState({
          formData: {
            actorType: ActorType.Business,
            fullName: '',
            nationalId: '',
            location: '',
            businessName: '',
            saccoId: '',
            email: '',
            phone: '',
            password: '',
          },
        })
      );

      render(<PersonalDetailsStep />);

      const businessNameLabel = screen.getByText(/Business Name/i);
      expect(businessNameLabel).toBeInTheDocument();
      // Check for the required indicator
      expect(businessNameLabel.parentElement?.textContent).toContain('*');
    });

    it('should show businessName as required for BusinessOwner actor type', () => {
      mockUseSignupWizard.mockReturnValue(
        createMockWizardState({
          formData: {
            actorType: ActorType.BusinessOwner,
            fullName: '',
            nationalId: '',
            location: '',
            businessName: '',
            saccoId: '',
            email: '',
            phone: '',
            password: '',
          },
        })
      );

      render(<PersonalDetailsStep />);

      const businessNameLabel = screen.getByText(/Business Name/i);
      expect(businessNameLabel).toBeInTheDocument();
      // Check for the required indicator
      expect(businessNameLabel.parentElement?.textContent).toContain('*');
    });
  });

  describe('Field updates', () => {
    it('should call updateField when fullName changes', async () => {
      const user = userEvent.setup();
      render(<PersonalDetailsStep />);

      const fullNameInput = screen.getByLabelText(/Full Name/i);

      await user.type(fullNameInput, 'John Doe');

      expect(mockUpdateField).toHaveBeenCalledWith('fullName', 'John Doe');
    });

    it('should call updateField when nationalId changes', async () => {
      const user = userEvent.setup();
      render(<PersonalDetailsStep />);

      const nationalIdInput = screen.getByLabelText(/National ID/i);

      await user.type(nationalIdInput, '12345678');

      expect(mockUpdateField).toHaveBeenCalledWith('nationalId', '12345678');
    });

    it('should call updateField when location changes', async () => {
      const user = userEvent.setup();
      render(<PersonalDetailsStep />);

      const locationInput = screen.getByLabelText(/Location/i);

      await user.type(locationInput, 'Nairobi, Kenya');

      expect(mockUpdateField).toHaveBeenCalledWith('location', 'Nairobi, Kenya');
    });

    it('should call updateField when businessName changes for Business actor', async () => {
      const user = userEvent.setup();
      mockUseSignupWizard.mockReturnValue(
        createMockWizardState({
          formData: {
            actorType: ActorType.Business,
            fullName: '',
            nationalId: '',
            location: '',
            businessName: '',
            saccoId: '',
            email: '',
            phone: '',
            password: '',
          },
        })
      );

      render(<PersonalDetailsStep />);

      const businessNameInput = screen.getByLabelText(/Business Name/i);

      await user.type(businessNameInput, 'ABC Transporters');

      expect(mockUpdateField).toHaveBeenCalledWith('businessName', 'ABC Transporters');
    });

    it('should call updateField when saccoName changes for Rider actor', async () => {
      const user = userEvent.setup();
      mockUseSignupWizard.mockReturnValue(
        createMockWizardState({
          formData: {
            actorType: ActorType.Rider,
            fullName: '',
            nationalId: '',
            location: '',
            businessName: '',
            saccoName: '',
            email: '',
            phone: '',
            password: '',
          },
        })
      );

      render(<PersonalDetailsStep />);

      const saccoNameInput = screen.getByLabelText(/SACCO Name/i);

      await user.type(saccoNameInput, 'My SACCO');

      expect(mockUpdateField).toHaveBeenCalledWith(
        'saccoName',
        'My SACCO'
      );
    });
  });

  describe('Field disabling', () => {
    it('should disable fields when isLoading is true', () => {
      mockUseSignupWizard.mockReturnValue(
        createMockWizardState({
          isLoading: true,
        })
      );

      render(<PersonalDetailsStep />);

      expect(screen.getByLabelText(/Full Name/i)).toBeDisabled();
      expect(screen.getByLabelText(/National ID/i)).toBeDisabled();
      expect(screen.getByLabelText(/Location/i)).toBeDisabled();
    });
  });

  describe('Field rendering with initial values', () => {
    it('should display pre-filled field values', () => {
      mockUseSignupWizard.mockReturnValue(
        createMockWizardState({
          formData: {
            actorType: ActorType.Rider,
            fullName: 'John Doe',
            nationalId: '12345678',
            location: 'Nairobi, Kenya',
            businessName: '',
            saccoName: 'My SACCO',
            email: '',
            phone: '',
            password: '',
          },
        })
      );

      render(<PersonalDetailsStep />);

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('12345678')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Nairobi, Kenya')).toBeInTheDocument();
      expect(screen.getByDisplayValue('My SACCO')).toBeInTheDocument();
    });
  });

  describe('SACCO Name field', () => {
    it('should accept any text for saccoName field', async () => {
      const user = userEvent.setup();
      mockUseSignupWizard.mockReturnValue(
        createMockWizardState({
          formData: {
            actorType: ActorType.Rider,
            fullName: '',
            nationalId: '',
            location: '',
            businessName: '',
            saccoName: '',
            email: '',
            phone: '',
            password: '',
          },
        })
      );

      render(<PersonalDetailsStep />);

      const saccoNameInput = screen.getByLabelText(/SACCO Name/i);
      await user.type(saccoNameInput, 'Any Text Here');

      expect(mockUpdateField).toHaveBeenCalledWith('saccoName', 'Any Text Here');
    });

    it('should not show error for empty optional saccoName', () => {
      mockUseSignupWizard.mockReturnValue(
        createMockWizardState({
          formData: {
            actorType: ActorType.Rider,
            fullName: '',
            nationalId: '',
            location: '',
            businessName: '',
            saccoName: '',
            email: '',
            phone: '',
            password: '',
          },
        })
      );

      render(<PersonalDetailsStep />);

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });
});
