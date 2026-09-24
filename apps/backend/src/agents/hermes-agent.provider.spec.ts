import { ConfigService } from '@nestjs/config';
import type { AgentStreamEvent } from '@kyrae/shared-contracts';
import { HermesAgentProvider } from './hermes-agent.provider';

describe('HermesAgentProvider', () => {
  const config = {
    get: jest.fn(
      (key: string, fallback?: string) =>
        ({
          HERMES_BASE_URL: 'http://hermes.test',
          HERMES_API_KEY: 'secret',
          HERMES_DEFAULT_MODEL: 'hermes-agent',
          HERMES_REQUEST_TIMEOUT_MS: '1000',
        })[key] ?? fallback
    ),
  } as unknown as ConfigService;

  afterEach(() => jest.restoreAllMocks());

  it('normalizes streamed chat tokens and hides credentials from the request contract', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          'data: {"id":"chat-1","choices":[{"delta":{"content":"Hola"}}]}\n\ndata: {"choices":[{"delta":{"content":" Kyrae"}}]}\n\ndata: [DONE]\n\n',
          { status: 200, headers: { 'content-type': 'text/event-stream' } }
        )
      );
    const provider = new HermesAgentProvider(config);
    const events: AgentStreamEvent[] = [];

    for await (const event of provider.streamMessage({
      agentId: 'agent-1',
      userId: 'user-1',
      conversationId: 'conversation-1',
      sessionKey: 'agent:agent-1:user:user-1:conversation:conversation-1',
      messages: [{ role: 'user', content: 'Hola' }],
    })) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual([
      'STARTED',
      'TOKEN',
      'MESSAGE',
      'TOKEN',
      'COMPLETED',
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://hermes.test/v1/chat/completions',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(request.headers).get('authorization')).toBe('Bearer secret');
    expect(new Headers(request.headers).get('accept')).toBe('text/event-stream, application/json');
  });

  it('normalizes a non-streaming chat response', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'chat-2',
          choices: [{ message: { role: 'assistant', content: 'Hermes funciona' } }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );
    const provider = new HermesAgentProvider(config);
    const events: AgentStreamEvent[] = [];

    for await (const event of provider.streamMessage({
      agentId: 'agent-1',
      userId: 'user-1',
      conversationId: 'conversation-1',
      sessionKey: 'agent:agent-1:user:user-1:conversation:conversation-1',
      messages: [{ role: 'user', content: 'Hola' }],
    })) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual(['STARTED', 'MESSAGE', 'TOKEN', 'COMPLETED']);
    expect(events[2].data).toEqual({ text: 'Hermes funciona' });
  });

  it('does not duplicate streamed content when token and message events share a chunk', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          'data: {"id":"chat-3","choices":[{"delta":{"content":"Hola"}}]}\n\ndata: [DONE]\n\n',
          { status: 200, headers: { 'content-type': 'text/event-stream' } }
        )
      );
    const provider = new HermesAgentProvider(config);

    await expect(
      provider.sendMessage({
        agentId: 'agent-1',
        userId: 'user-1',
        conversationId: 'conversation-1',
        sessionKey: 'agent:agent-1:user:user-1:conversation:conversation-1',
        messages: [{ role: 'user', content: 'Hola' }],
      })
    ).resolves.toMatchObject({ message: 'Hola', providerRequestId: 'chat-3' });
  });

  it('maps upstream failures to a controlled provider error', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 500 }));
    const provider = new HermesAgentProvider(config);

    await expect(provider.healthCheck()).resolves.toMatchObject({
      provider: 'HERMES',
      status: 'UNAVAILABLE',
    });
  });
});
