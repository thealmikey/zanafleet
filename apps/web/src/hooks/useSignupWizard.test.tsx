import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

import {
  SignupWizardProvider,
  WIZARD_STEPS,
} from '../contexts/SignupWizardContext';
import * as signupApi from '../services/signupApi';
import { ActorType, SignUpSessionStatus } from '../types';

import { useSignupWizard } from './useSignupWizard';

jest.mock('../services/signupApi');

const mockInitiateSignup = signupApi.initiateSignup as jest.MockedFunction<typeof signupApi.initiateSignup>;
const mockUpdateStep = signupApi.updateStep as jest.MockedFunction<typeof signupApi.updateStep>;
const mockGetSession = signupApi.getSession as jest.MockedFunction<typeof signupApi.getSession>;
const mockFinalizeSignup = signupApi.finalizeSignup as jest.MockedFunction<typeof signupApi.finalizeSignup>;

const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <SignupWizardProvider>{children}</SignupWizardProvider>
);

describe('useSignupWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('context requirement', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSignupWizard());
      }).toThrow('useSignupWizard must be used within a SignupWizardProvider');

      consoleSpy.mockRestore();
    });

    it('should not throw when used within provider', () => {
      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.sessionId).toBeNull();
    });
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      expect(result.current.sessionId).toBeNull();
      expect(result.current.currentStep).toBe(0);
      expect(result.current.formData).toEqual({
        actorType: null,
        fullName: '',
        nationalId: '',
        location: '',
        businessName: '',
        saccoName: '',
        email: '',
        phone: '',
        password: '',
      });
      expect(result.current.completedSteps).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('step navigation', () => {
    it('should increment step with nextStep()', () => {
      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(1);
    });

    it('should not exceed max step with nextStep()', () => {
      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      act(() => {
        for (let i = 0; i < WIZARD_STEPS.length + 2; i++) {
          result.current.nextStep();
        }
      });

      expect(result.current.currentStep).toBe(WIZARD_STEPS.length - 1);
    });

    it('should decrement step with prevStep()', () => {
      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      act(() => {
        result.current.nextStep();
        result.current.nextStep();
        result.current.prevStep();
      });

      expect(result.current.currentStep).toBe(1);
    });

    it('should not go below 0 with prevStep()', () => {
      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      act(() => {
        result.current.prevStep();
        result.current.prevStep();
      });

      expect(result.current.currentStep).toBe(0);
    });

    it('should go to specific step with goToStep()', () => {
      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      act(() => {
        result.current.goToStep(2);
      });

      expect(result.current.currentStep).toBe(2);
    });

    it('should clamp step within valid range', () => {
      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      act(() => {
        result.current.goToStep(100);
      });

      expect(result.current.currentStep).toBe(WIZARD_STEPS.length - 1);

      act(() => {
        result.current.goToStep(-5);
      });

      expect(result.current.currentStep).toBe(0);
    });
  });

  describe('updateField', () => {
    it('should update actorType', () => {
      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      act(() => {
        result.current.updateField('actorType', ActorType.Rider);
      });

      expect(result.current.formData.actorType).toBe(ActorType.Rider);
    });

    it('should update fullName', () => {
      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      act(() => {
        result.current.updateField('fullName', 'John Doe');
      });

      expect(result.current.formData.fullName).toEqual('John Doe');
    });

    it('should update nationalId', () => {
      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      act(() => {
        result.current.updateField('nationalId', '12345678');
      });

      expect(result.current.formData.nationalId).toEqual('12345678');
    });

    it('should update location', () => {
      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      act(() => {
        result.current.updateField('location', 'Nairobi, Kenya');
      });

      expect(result.current.formData.location).toEqual('Nairobi, Kenya');
    });

    it('should preserve other fields when updating one field', () => {
      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      act(() => {
        result.current.updateField('actorType', ActorType.Business);
        result.current.updateField('fullName', 'John Doe');
        result.current.updateField('nationalId', '12345678');
      });

      expect(result.current.formData).toEqual({
        actorType: ActorType.Business,
        fullName: 'John Doe',
        nationalId: '12345678',
        location: '',
        businessName: '',
        saccoName: '',
        email: '',
        phone: '',
        password: '',
      });
    });
  });

  describe('initSession', () => {
    it('should initiate session and persist sessionId to localStorage', async () => {
      mockInitiateSignup.mockResolvedValueOnce({
        sessionId: 'new-session-id',
        expiresAt: '2024-01-02T00:00:00Z',
      });

      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      await act(async () => {
        await result.current.initSession(ActorType.Rider);
      });

      expect(result.current.sessionId).toBe('new-session-id');
      expect(result.current.formData.actorType).toBe(ActorType.Rider);
      expect(localStorage.getItem('zanafleet_signup_session_id')).toBe('new-session-id');
      expect(mockInitiateSignup).toHaveBeenCalledWith(ActorType.Rider);
    });

    it('should set loading state during initiation', async () => {
      let resolvePromise: (value: { sessionId: string; expiresAt: string }) => void;
      mockInitiateSignup.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
      );

      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      let initPromise: Promise<void>;
      act(() => {
        initPromise = result.current.initSession(ActorType.Rider);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise({ sessionId: 'id', expiresAt: '2024-01-02T00:00:00Z' });
        await initPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set error on failure', async () => {
      mockInitiateSignup.mockRejectedValueOnce(
        new signupApi.ApiError(400, 'Bad Request'),
      );

      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      await act(async () => {
        try {
          await result.current.initSession(ActorType.Rider);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Failed to initiate session: Bad Request');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('saveProgress', () => {
    it('should throw error when no session exists', async () => {
      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      await expect(
        act(async () => {
          await result.current.saveProgress();
        }),
      ).rejects.toThrow('No active session');
    });

    it('should save progress with current step data', async () => {
      mockInitiateSignup.mockResolvedValueOnce({
        sessionId: 'session-123',
        expiresAt: '2024-01-02T00:00:00Z',
      });
      mockUpdateStep.mockResolvedValueOnce({
        sessionId: 'session-123',
        status: SignUpSessionStatus.PARTIAL,
        completedSteps: ['account-type'],
      });

      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      await act(async () => {
        await result.current.initSession(ActorType.Rider);
      });

      await act(async () => {
        await result.current.saveProgress();
      });

      expect(mockUpdateStep).toHaveBeenCalledWith('session-123', {
        stepName: 'account-type',
        fullName: undefined,
        nationalId: undefined,
        location: undefined,
        businessName: undefined,
        saccoName: undefined,
      });
      expect(result.current.completedSteps).toEqual(['account-type']);
    });

    it('should include form data in save request', async () => {
      mockInitiateSignup.mockResolvedValueOnce({
        sessionId: 'session-123',
        expiresAt: '2024-01-02T00:00:00Z',
      });
      mockUpdateStep.mockResolvedValueOnce({
        sessionId: 'session-123',
        status: SignUpSessionStatus.PARTIAL,
        completedSteps: ['workspace'],
      });

      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      await act(async () => {
        await result.current.initSession(ActorType.Rider);
        result.current.updateField('fullName', 'Jane Doe');
        result.current.updateField('nationalId', '87654321');
        result.current.goToStep(1);
      });

      await act(async () => {
        await result.current.saveProgress();
      });

      expect(mockUpdateStep).toHaveBeenCalledWith('session-123', {
        stepName: 'personal-details',
        fullName: 'Jane Doe',
        nationalId: '87654321',
        location: undefined,
        businessName: undefined,
        saccoName: undefined,
      });
    });
  });

  describe('finalize', () => {
    it('should throw error when no session exists', async () => {
      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      await expect(
        act(async () => {
          await result.current.finalize();
        }),
      ).rejects.toThrow('No active session');
    });

    it('should finalize session and clear state', async () => {
      mockInitiateSignup.mockResolvedValueOnce({
        sessionId: 'session-123',
        expiresAt: '2024-01-02T00:00:00Z',
      });
      mockFinalizeSignup.mockResolvedValueOnce({
        actorId: 'actor-456',
        workspaceId: 'ws-789',
      });

      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      await act(async () => {
        await result.current.initSession(ActorType.Rider);
      });

      expect(localStorage.getItem('zanafleet_signup_session_id')).toBe('session-123');

      let finalizeResult: { actorId: string; workspaceId: string };
      await act(async () => {
        finalizeResult = await result.current.finalize();
      });

      expect(finalizeResult!).toEqual({ actorId: 'actor-456', workspaceId: 'ws-789' });
      expect(result.current.sessionId).toBeNull();
      expect(result.current.formData.actorType).toBeNull();
      expect(localStorage.getItem('zanafleet_signup_session_id')).toBeNull();
    });
  });

  describe('clearSession', () => {
    it('should reset state and clear localStorage', async () => {
      mockInitiateSignup.mockResolvedValueOnce({
        sessionId: 'session-123',
        expiresAt: '2024-01-02T00:00:00Z',
      });

      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      await act(async () => {
        await result.current.initSession(ActorType.Rider);
        result.current.updateField('fullName', 'Test User');
        result.current.nextStep();
      });

      expect(result.current.sessionId).toBe('session-123');
      expect(result.current.currentStep).toBe(1);

      act(() => {
        result.current.clearSession();
      });

      expect(result.current.sessionId).toBeNull();
      expect(result.current.currentStep).toBe(0);
      expect(result.current.formData.actorType).toBeNull();
      expect(localStorage.getItem('zanafleet_signup_session_id')).toBeNull();
    });
  });

  describe('session recovery', () => {
    it('should recover session from localStorage on mount', async () => {
      localStorage.setItem('zanafleet_signup_session_id', 'stored-session-id');

      mockGetSession.mockResolvedValueOnce({
        sessionId: 'stored-session-id',
        status: SignUpSessionStatus.PARTIAL,
        actorType: ActorType.Business,
        fullName: 'Recovered User',
        nationalId: '12345678',
        location: 'Nairobi',
        businessName: 'Test Business',
        saccoName: null,
        email: null,
        phone: null,
        completedSteps: ['account-type', 'personal-details'],
        expiresAt: '2024-01-02T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
      });

      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      await waitFor(() => {
        expect(result.current.sessionId).toBe('stored-session-id');
      });

      expect(result.current.formData.actorType).toBe(ActorType.Business);
      expect(result.current.formData.fullName).toEqual('Recovered User');
      expect(result.current.formData.nationalId).toEqual('12345678');
      expect(result.current.formData.location).toEqual('Nairobi');
      expect(result.current.formData.businessName).toEqual('Test Business');
      expect(result.current.completedSteps).toEqual(['account-type', 'personal-details']);
      expect(result.current.currentStep).toBe(2);
    });

    it('should clear localStorage when session not found', async () => {
      localStorage.setItem('zanafleet_signup_session_id', 'expired-session-id');

      mockGetSession.mockRejectedValueOnce(
        new signupApi.ApiError(404, 'Not Found'),
      );

      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(localStorage.getItem('zanafleet_signup_session_id')).toBeNull();
      expect(result.current.sessionId).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should set error on non-404 recovery failure', async () => {
      localStorage.setItem('zanafleet_signup_session_id', 'bad-session-id');

      mockGetSession.mockRejectedValueOnce(
        new signupApi.ApiError(500, 'Internal Server Error'),
      );

      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to recover session');
      });

      expect(localStorage.getItem('zanafleet_signup_session_id')).toBeNull();
    });

    it('should not attempt recovery when no stored sessionId', async () => {
      const { result } = renderHook(() => useSignupWizard(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetSession).not.toHaveBeenCalled();
    });
  });
});
