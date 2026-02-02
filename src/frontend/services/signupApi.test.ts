import { ActorType, SignUpSessionStatus } from '../types';

import { initiateSignup, updateStep, getSession, finalizeSignup, listWorkspaces, getAllowedWorkspaceTypes, getWorkspaceTypesForActor, ApiError } from './signupApi';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('signupApi', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('initiateSignup', () => {
    it('should POST to /signup with actorType and return session info', async () => {
      const mockResponse = {
        sessionId: 'test-session-id',
        expiresAt: '2024-01-02T00:00:00Z',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await initiateSignup(ActorType.Rider);

      expect(mockFetch).toHaveBeenCalledWith('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorType: ActorType.Rider, idempotencyKey: undefined }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should include idempotencyKey when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionId: 'id', expiresAt: '2024-01-02T00:00:00Z' }),
      });

      await initiateSignup(ActorType.Business, 'idem-key-123');

      expect(mockFetch).toHaveBeenCalledWith('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorType: ActorType.Business, idempotencyKey: 'idem-key-123' }),
      });
    });

    it('should throw ApiError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Invalid actor type' }),
      });

      await expect(initiateSignup(ActorType.Rider)).rejects.toThrow(ApiError);
    });
  });

  describe('updateStep', () => {
    it('should PATCH to /signup/:id with step data', async () => {
      const mockResponse = {
        sessionId: 'test-session-id',
        status: SignUpSessionStatus.PARTIAL,
        completedSteps: ['workspace'],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await updateStep('test-session-id', {
        stepName: 'workspace',
        workspaceId: 'workspace-123',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/signup/test-session-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepName: 'workspace', workspaceId: 'workspace-123' }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw ApiError on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Session not found' }),
      });

      await expect(updateStep('invalid-id', { stepName: 'test' })).rejects.toThrow(ApiError);
    });
  });

  describe('getSession', () => {
    it('should GET /signup/:id and return full session', async () => {
      const mockSession = {
        sessionId: 'test-session-id',
        status: SignUpSessionStatus.PARTIAL,
        actorType: ActorType.Rider,
        workspaceId: 'workspace-123',
        roles: ['Rider'],
        linkedWallets: [],
        completedSteps: ['workspace'],
        expiresAt: '2024-01-02T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession,
      });

      const result = await getSession('test-session-id');

      expect(mockFetch).toHaveBeenCalledWith('/api/signup/test-session-id', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockSession);
    });

    it('should throw ApiError when session not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Session not found' }),
      });

      await expect(getSession('invalid-id')).rejects.toThrow(ApiError);
    });
  });

  describe('finalizeSignup', () => {
    it('should POST to /signup/:id/finalize and return actor info', async () => {
      const mockResponse = {
        actorId: 'actor-123',
        workspaceId: 'workspace-123',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await finalizeSignup('test-session-id');

      expect(mockFetch).toHaveBeenCalledWith('/api/signup/test-session-id/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw ApiError when workspaceId is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'workspaceId is required' }),
      });

      await expect(finalizeSignup('test-session-id')).rejects.toThrow(ApiError);
    });
  });

  describe('listWorkspaces', () => {
    it('should GET /workspaces and return workspace list', async () => {
      const mockWorkspaces = [
        { workspaceId: 'ws-1', name: 'Test SACCO', type: 'SACCO' },
        { workspaceId: 'ws-2', name: 'Another SACCO', type: 'SACCO' },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWorkspaces,
      });

      const result = await listWorkspaces();

      expect(mockFetch).toHaveBeenCalledWith('/api/workspaces', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockWorkspaces);
    });

    it('should include type query parameter when provided', async () => {
      const mockWorkspaces = [
        { workspaceId: 'ws-1', name: 'Test SACCO', type: 'SACCO' },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockWorkspaces,
      });

      const result = await listWorkspaces('SACCO');

      expect(mockFetch).toHaveBeenCalledWith('/api/workspaces?type=SACCO', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockWorkspaces);
    });

    it('should throw ApiError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Database connection failed' }),
      });

      await expect(listWorkspaces()).rejects.toThrow(ApiError);
    });
  });

  describe('getAllowedWorkspaceTypes', () => {
    it('should GET /workspaces/allowed-types with actorType query parameter', async () => {
      const mockTypes = ['SACCO'];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTypes,
      });

      const result = await getAllowedWorkspaceTypes(ActorType.Rider);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/workspaces/allowed-types?actorType=Rider',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      expect(result).toEqual(mockTypes);
    });

    it('should throw ApiError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Server error' }),
      });

      await expect(getAllowedWorkspaceTypes(ActorType.Rider)).rejects.toThrow(ApiError);
    });
  });

  describe('getWorkspaceTypesForActor', () => {
    it("should return ['SACCO'] for SaccoAdmin", () => {
      const result = getWorkspaceTypesForActor(ActorType.SaccoAdmin);
      expect(result).toEqual(['SACCO']);
    });

    it("should return ['SACCO'] for Rider", () => {
      const result = getWorkspaceTypesForActor(ActorType.Rider);
      expect(result).toEqual(['SACCO']);
    });

    it("should return ['BUSINESS'] for Business", () => {
      const result = getWorkspaceTypesForActor(ActorType.Business);
      expect(result).toEqual(['BUSINESS']);
    });

    it("should return ['BUSINESS'] for BusinessOwner", () => {
      const result = getWorkspaceTypesForActor(ActorType.BusinessOwner);
      expect(result).toEqual(['BUSINESS']);
    });

    it("should return ['OPS'] for Internal", () => {
      const result = getWorkspaceTypesForActor(ActorType.Internal);
      expect(result).toEqual(['OPS']);
    });

    it("should return ['OPS'] for AIService", () => {
      const result = getWorkspaceTypesForActor(ActorType.AIService);
      expect(result).toEqual(['OPS']);
    });

    it("should return empty array for null actorType", () => {
      expect(getWorkspaceTypesForActor(null)).toEqual([]);
    });
  });

  describe('ApiError', () => {
    it('should contain status, statusText, and body', () => {
      const error = new ApiError(400, 'Bad Request', { message: 'Invalid input' });

      expect(error.status).toBe(400);
      expect(error.statusText).toBe('Bad Request');
      expect(error.body).toEqual({ message: 'Invalid input' });
      expect(error.message).toBe('API Error: 400 Bad Request');
      expect(error.name).toBe('ApiError');
    });
  });
});
