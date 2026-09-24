import { OpenClawService } from '../openclaw/openclaw.service';
import { OpenClawAgentProvider } from './openclaw-agent.provider';

describe('OpenClawAgentProvider', () => {
  it('preserves the existing OpenClaw message contract', async () => {
    const sendMessageMock = jest.fn().mockResolvedValue({
      message: 'respuesta',
      requestId: 'request-1',
      metadata: { mode: 'mock' },
    });
    const service = {
      sendMessage: sendMessageMock,
      healthCheck: jest.fn().mockResolvedValue({ provider: 'OPENCLAW', status: 'AVAILABLE' }),
    } as unknown as OpenClawService;
    const provider = new OpenClawAgentProvider(service);

    const response = await provider.sendMessage({
      agentId: 'agent-1',
      userId: 'user-1',
      conversationId: 'conversation-1',
      sessionKey: 'session-key',
      messages: [{ role: 'user', content: 'hola' }],
    });
    expect(response).toMatchObject({ message: 'respuesta', providerRequestId: 'request-1' });
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'conversation-1', message: 'hola' })
    );
  });
});
