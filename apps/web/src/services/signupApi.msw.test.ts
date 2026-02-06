import { initiateSignup, getSession, updateStep, finalizeSignup } from './signupApi';
import { ActorType, SignUpSessionStatus } from '../types';

describe('signupApi MSW contract', () => {
  it('initiate -> get -> update -> get -> finalize', async () => {
    const init = await initiateSignup(ActorType.Business);

    expect(init).toEqual({
      sessionId: expect.any(String),
      expiresAt: expect.any(String),
    });

    const sessionId = init.sessionId;

    const session1 = await getSession(sessionId);
    expect(session1.sessionId).toBe(sessionId);
    expect(session1.actorType).toBe(ActorType.Business);
    expect(session1.status).toBe(SignUpSessionStatus.INITIATED);
    expect(Array.isArray(session1.completedSteps)).toBe(true);

    const updateResp = await updateStep(sessionId, {
      stepName: 'personal-details',
      fullName: 'Test User',
      nationalId: 'ID12345678',
      location: 'Nairobi',
      email: 'test@example.com',
      phone: '+254700000000',
      businessName: 'Acme Corp',
      saccoName: 'N/A',
    });

    expect(updateResp.sessionId).toBe(sessionId);
    expect(updateResp.completedSteps).toContain('personal-details');
    expect(updateResp.status).toBe(SignUpSessionStatus.PARTIAL);

    const session2 = await getSession(sessionId);
    expect(session2.fullName).toBe('Test User');
    expect(session2.nationalId).toBe('ID12345678');
    expect(session2.location).toBe('Nairobi');
    expect(session2.email).toBe('test@example.com');
    expect(session2.phone).toBe('+254700000000');
    expect(session2.businessName).toBe('Acme Corp');
    expect(session2.saccoName).toBe('N/A');
    expect(session2.completedSteps).toContain('personal-details');

    const finalizeResp = await finalizeSignup(sessionId);
    expect(finalizeResp).toEqual({
      actorId: expect.any(String),
      workspaceId: expect.any(String),
    });
  });
});
