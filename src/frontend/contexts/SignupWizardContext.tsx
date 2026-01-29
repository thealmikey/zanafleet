import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
} from 'react';

import {
  initiateSignup,
  updateStep,
  getSession,
  finalizeSignup,
  ApiError,
} from '../services/signupApi';
import {
  ActorType,
  FinalizeSignupResponse,
  SignupSession,
} from '../types';

const STORAGE_KEY = 'zanafleet_signup_session_id';

export const WIZARD_STEPS = [
  'account-type',
  'workspace',
  'roles',
  'wallets',
] as const;

export type WizardStepName = (typeof WIZARD_STEPS)[number];

export interface WizardFormData {
  actorType: ActorType | null;
  workspaceId: string | null;
  roles: string[];
  linkedWallets: string[];
}

export interface SignupWizardState {
  sessionId: string | null;
  currentStep: number;
  formData: WizardFormData;
  completedSteps: string[];
  isLoading: boolean;
  error: string | null;
}

export interface SignupWizardActions {
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  updateField: <K extends keyof WizardFormData>(name: K, value: WizardFormData[K]) => void;
  initSession: (actorType: ActorType) => Promise<void>;
  saveProgress: () => Promise<void>;
  finalize: () => Promise<FinalizeSignupResponse>;
  clearSession: () => void;
}

export type SignupWizardContextValue = SignupWizardState & SignupWizardActions;

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SESSION_ID'; payload: string | null }
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'SET_COMPLETED_STEPS'; payload: string[] }
  | { type: 'UPDATE_FIELD'; payload: { name: keyof WizardFormData; value: WizardFormData[keyof WizardFormData] } }
  | { type: 'RESTORE_SESSION'; payload: SignupSession }
  | { type: 'RESET' };

const initialFormData: WizardFormData = {
  actorType: null,
  workspaceId: null,
  roles: [],
  linkedWallets: [],
};

const initialState: SignupWizardState = {
  sessionId: null,
  currentStep: 0,
  formData: initialFormData,
  completedSteps: [],
  isLoading: false,
  error: null,
};

function reducer(state: SignupWizardState, action: Action): SignupWizardState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };
    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_COMPLETED_STEPS':
      return { ...state, completedSteps: action.payload };
    case 'UPDATE_FIELD':
      return {
        ...state,
        formData: { ...state.formData, [action.payload.name]: action.payload.value },
      };
    case 'RESTORE_SESSION':
      return {
        ...state,
        sessionId: action.payload.sessionId,
        formData: {
          actorType: action.payload.actorType,
          workspaceId: action.payload.workspaceId ?? null,
          roles: action.payload.roles,
          linkedWallets: action.payload.linkedWallets,
        },
        completedSteps: action.payload.completedSteps,
        currentStep: Math.max(0, action.payload.completedSteps.length),
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export const SignupWizardContext = createContext<SignupWizardContextValue | null>(null);

export interface SignupWizardProviderProps {
  children: React.ReactNode;
}

export function SignupWizardProvider({ children }: SignupWizardProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(reducer, initialState);

  const persistSessionId = useCallback((sessionId: string | null): void => {
    if (sessionId) {
      localStorage.setItem(STORAGE_KEY, sessionId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const recoverSession = useCallback(async (): Promise<void> => {
    const storedSessionId = localStorage.getItem(STORAGE_KEY);
    if (!storedSessionId) {
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const session = await getSession(storedSessionId);
      dispatch({ type: 'RESTORE_SESSION', payload: session });
    } catch (err) {
      localStorage.removeItem(STORAGE_KEY);
      if (err instanceof ApiError && err.status === 404) {
        // Session expired or not found, silently clear
        return;
      }
      dispatch({ type: 'SET_ERROR', payload: 'Failed to recover session' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  useEffect(() => {
    void recoverSession();
  }, [recoverSession]);

  const nextStep = useCallback((): void => {
    dispatch({
      type: 'SET_CURRENT_STEP',
      payload: Math.min(state.currentStep + 1, WIZARD_STEPS.length - 1),
    });
  }, [state.currentStep]);

  const prevStep = useCallback((): void => {
    dispatch({
      type: 'SET_CURRENT_STEP',
      payload: Math.max(state.currentStep - 1, 0),
    });
  }, [state.currentStep]);

  const goToStep = useCallback((step: number): void => {
    const clampedStep = Math.max(0, Math.min(step, WIZARD_STEPS.length - 1));
    dispatch({ type: 'SET_CURRENT_STEP', payload: clampedStep });
  }, []);

  const updateField = useCallback(<K extends keyof WizardFormData>(
    name: K,
    value: WizardFormData[K],
  ): void => {
    dispatch({ type: 'UPDATE_FIELD', payload: { name, value } });
  }, []);

  const initSession = useCallback(async (actorType: ActorType): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const response = await initiateSignup(actorType);
      dispatch({ type: 'SET_SESSION_ID', payload: response.sessionId });
      dispatch({ type: 'UPDATE_FIELD', payload: { name: 'actorType', value: actorType } });
      persistSessionId(response.sessionId);
    } catch (err) {
      const message = err instanceof ApiError
        ? `Failed to initiate session: ${err.statusText}`
        : 'Failed to initiate session';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw err;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [persistSessionId]);

  const saveProgress = useCallback(async (): Promise<void> => {
    if (!state.sessionId) {
      throw new Error('No active session');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    const currentStepName = WIZARD_STEPS[state.currentStep];

    try {
      const response = await updateStep(state.sessionId, {
        stepName: currentStepName,
        workspaceId: state.formData.workspaceId ?? undefined,
        roles: state.formData.roles.length > 0 ? state.formData.roles : undefined,
        linkedWallets: state.formData.linkedWallets.length > 0 ? state.formData.linkedWallets : undefined,
      });
      dispatch({ type: 'SET_COMPLETED_STEPS', payload: response.completedSteps });
    } catch (err) {
      const message = err instanceof ApiError
        ? `Failed to save progress: ${err.statusText}`
        : 'Failed to save progress';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw err;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.sessionId, state.currentStep, state.formData]);

  const finalize = useCallback(async (): Promise<FinalizeSignupResponse> => {
    if (!state.sessionId) {
      throw new Error('No active session');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await finalizeSignup(state.sessionId);
      persistSessionId(null);
      dispatch({ type: 'RESET' });
      return response;
    } catch (err) {
      const message = err instanceof ApiError
        ? `Failed to finalize signup: ${err.statusText}`
        : 'Failed to finalize signup';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw err;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.sessionId, persistSessionId]);

  const clearSession = useCallback((): void => {
    persistSessionId(null);
    dispatch({ type: 'RESET' });
  }, [persistSessionId]);

  const value = useMemo<SignupWizardContextValue>(() => ({
    ...state,
    nextStep,
    prevStep,
    goToStep,
    updateField,
    initSession,
    saveProgress,
    finalize,
    clearSession,
  }), [state, nextStep, prevStep, goToStep, updateField, initSession, saveProgress, finalize, clearSession]);

  return (
    <SignupWizardContext.Provider value={value}>
      {children}
    </SignupWizardContext.Provider>
  );
}
