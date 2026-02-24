import { ActorType, SignUpSessionStatus } from '../types';

import { initiateSignup, updateStep, getSession, finalizeSignup, ApiError } from './signupApi';

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
        completedSteps: ['personal-details'],
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await updateStep('test-session-id', {
        stepName: 'personal-details',
        fullName: 'Test User',
        location: 'Nairobi',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/signup/test-session-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepName: 'personal-details',
          fullName: 'Test User',
          location: 'Nairobi',
        }),
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
        fullName: 'John Doe',
        nationalId: '12345678',
        location: 'Nairobi',
        saccoId: 'workspace-123',
        businessName: null,
        completedSteps: ['personal-details'],
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
