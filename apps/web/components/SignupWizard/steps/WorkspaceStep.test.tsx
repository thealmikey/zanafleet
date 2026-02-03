import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { server } from '../../../test/mocks/server';
import { SignupWizardProvider } from '../../../contexts/SignupWizardContext';
import { WorkspaceStep } from './WorkspaceStep';
import { ActorType } from '../../../types';

const API_BASE_URL = '/api';

interface WrapperProps {
  children: React.ReactNode;
  initialActorType?: ActorType;
}

function TestWrapper({ children, initialActorType }: WrapperProps): React.ReactElement {
  return <SignupWizardProvider>{children}</SignupWizardProvider>;
}

function renderWorkspaceStep(actorType: ActorType = ActorType.Rider): {
  user: ReturnType<typeof userEvent.setup>;
} {
  const user = userEvent.setup();

  render(
    <TestWrapper>
      <WorkspaceStepWithActorType actorType={actorType} />
    </TestWrapper>
  );

  return { user };
}

function WorkspaceStepWithActorType({
  actorType,
}: {
  actorType: ActorType;
}): React.ReactElement {
  const { updateField } = require('../../../hooks/useSignupWizard').useSignupWizard();

  React.useEffect(() => {
    updateField('actorType', actorType);
  }, [actorType, updateField]);

  return <WorkspaceStep />;
}

describe('WorkspaceStep Integration Tests', () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_BASE_URL}/workspaces/allowed-types`, () => {
        return HttpResponse.json(['SACCO']);
      }),
      http.get(`${API_BASE_URL}/workspaces`, () => {
        return HttpResponse.json([
          { workspaceId: 'ws-1', name: 'Test SACCO', type: 'SACCO' },
          { workspaceId: 'ws-2', name: 'Another SACCO', type: 'SACCO' },
        ]);
      })
    );
  });

  describe('error message display when fetch fails', () => {
    it('should display error message when getAllowedWorkspaceTypes fails', async () => {
      server.use(
        http.get(`${API_BASE_URL}/workspaces/allowed-types`, () => {
          return HttpResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      renderWorkspaceStep();

      await waitFor(() => {
        expect(screen.getByText(/API Error: 500/i)).toBeInTheDocument();
      });
    });

    it('should display error message when listWorkspaces fails', async () => {
      server.use(
        http.get(`${API_BASE_URL}/workspaces/allowed-types`, () => {
          return HttpResponse.json(['SACCO']);
        }),
        http.get(`${API_BASE_URL}/workspaces`, () => {
          return HttpResponse.json(
            { message: 'Database connection failed' },
            { status: 500 }
          );
        })
      );

      renderWorkspaceStep();

      await waitFor(() => {
        expect(screen.getByText(/API Error: 500/i)).toBeInTheDocument();
      });
    });

    it('should display custom error message from error response', async () => {
      server.use(
        http.get(`${API_BASE_URL}/workspaces/allowed-types`, () => {
          return HttpResponse.json(
            { message: 'Service unavailable' },
            { status: 503, statusText: 'Service Unavailable' }
          );
        })
      );

      renderWorkspaceStep();

      await waitFor(() => {
        expect(screen.getByText(/API Error: 503 Service Unavailable/i)).toBeInTheDocument();
      });
    });
  });

  describe('user cannot proceed without workspace selection after fetch error', () => {
    it('should not show workspace autocomplete when fetch fails', async () => {
      server.use(
        http.get(`${API_BASE_URL}/workspaces/allowed-types`, () => {
          return HttpResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      renderWorkspaceStep();

      await waitFor(() => {
        expect(screen.getByText(/API Error: 500/i)).toBeInTheDocument();
      });

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('should show error state and retry button instead of form when fetch fails', async () => {
      server.use(
        http.get(`${API_BASE_URL}/workspaces/allowed-types`, () => {
          return HttpResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      renderWorkspaceStep();

      await waitFor(() => {
        expect(screen.getByText(/API Error: 500/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should not allow form submission with empty workspaceIds after error', async () => {
      server.use(
        http.get(`${API_BASE_URL}/workspaces/allowed-types`, () => {
          return HttpResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      renderWorkspaceStep();

      await waitFor(() => {
        expect(screen.getByText(/API Error: 500/i)).toBeInTheDocument();
      });

      expect(screen.queryByPlaceholderText(/select a workspace/i)).not.toBeInTheDocument();
    });
  });

  describe('retry mechanism', () => {
    it('should show retry button when fetch fails', async () => {
      server.use(
        http.get(`${API_BASE_URL}/workspaces/allowed-types`, () => {
          return HttpResponse.json(
            { message: 'Server error' },
            { status: 500 }
          );
        })
      );

      renderWorkspaceStep();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should refetch workspaces when retry button is clicked', async () => {
      let callCount = 0;

      server.use(
        http.get(`${API_BASE_URL}/workspaces/allowed-types`, () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json(
              { message: 'Server error' },
              { status: 500 }
            );
          }
          return HttpResponse.json(['SACCO']);
        }),
        http.get(`${API_BASE_URL}/workspaces`, () => {
          return HttpResponse.json([
            { workspaceId: 'ws-1', name: 'Test SACCO', type: 'SACCO' },
          ]);
        })
      );

      const { user } = renderWorkspaceStep();

      await waitFor(() => {
        expect(screen.getByText(/API Error: 500/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByText(/API Error: 500/i)).not.toBeInTheDocument();
      });

      expect(callCount).toBe(2);
    });

    it('should show workspaces after successful retry', async () => {
      let callCount = 0;

      server.use(
        http.get(`${API_BASE_URL}/workspaces/allowed-types`, () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json(
              { message: 'Server error' },
              { status: 500 }
            );
          }
          return HttpResponse.json(['SACCO']);
        }),
        http.get(`${API_BASE_URL}/workspaces`, () => {
          return HttpResponse.json([
            { workspaceId: 'ws-1', name: 'Test SACCO', type: 'SACCO' },
          ]);
        })
      );

      const { user } = renderWorkspaceStep();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
    });

    it('should clear error message when retry starts', async () => {
      let callCount = 0;

      server.use(
        http.get(`${API_BASE_URL}/workspaces/allowed-types`, () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json(
              { message: 'Server error' },
              { status: 500 }
            );
          }
          return new Promise((resolve) =>
            setTimeout(() => resolve(HttpResponse.json(['SACCO'])), 100)
          );
        }),
        http.get(`${API_BASE_URL}/workspaces`, () => {
          return HttpResponse.json([]);
        })
      );

      const { user } = renderWorkspaceStep();

      await waitFor(() => {
        expect(screen.getByText(/API Error: 500/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.queryByText(/API Error: 500/i)).not.toBeInTheDocument();
      });
    });

    it('should disable retry button while loading', async () => {
      let resolvePromise: () => void;
      const delayedPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      let callCount = 0;

      server.use(
        http.get(`${API_BASE_URL}/workspaces/allowed-types`, async () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json(
              { message: 'Server error' },
              { status: 500 }
            );
          }
          await delayedPromise;
          return HttpResponse.json(['SACCO']);
        })
      );

      const { user } = renderWorkspaceStep();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeDisabled();
      });

      resolvePromise!();
    });

    it('should show error again if retry also fails', async () => {
      server.use(
        http.get(`${API_BASE_URL}/workspaces/allowed-types`, () => {
          return HttpResponse.json(
            { message: 'Server error' },
            { status: 500 }
          );
        })
      );

      const { user } = renderWorkspaceStep();

      await waitFor(() => {
        expect(screen.getByText(/API Error: 500/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText(/API Error: 500/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('successful workspace loading', () => {
    it('should load and display workspaces on successful fetch', async () => {
      renderWorkspaceStep();

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      expect(screen.queryByText(/API Error/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });

    it('should show loading state while fetching', async () => {
      server.use(
        http.get(`${API_BASE_URL}/workspaces/allowed-types`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json(['SACCO']);
        })
      );

      renderWorkspaceStep();

      expect(screen.getByText(/loading workspaces/i)).toBeInTheDocument();
    });
  });
});
