import type { AgentRunEvent, AgentStreamEvent } from '@kyrae/shared-contracts';
import { AgentOrchestratorService } from './agent-orchestrator.service';

describe('AgentOrchestratorService', () => {
  it('assigns persisted event sequences independently of provider sequences', async () => {
    const eventRepository = {
      count: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1),
      create: jest.fn((event) => event),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AgentOrchestratorService(
      {} as never,
      {} as never,
      eventRepository as never,
      {} as never,
      {} as never,
      {} as never
    );
    const persistEvent = (
      service as unknown as {
        persistEvent: (
          execution: { id: string },
          event: AgentStreamEvent | AgentRunEvent
        ) => Promise<void>;
      }
    ).persistEvent.bind(service);
    const execution = { id: 'execution-1' };

    await persistEvent(execution, { type: 'STARTED', data: {} });
    await persistEvent(execution, { type: 'TOKEN', data: { text: 'Hola' }, sequence: 0 });

    expect(eventRepository.save).toHaveBeenNthCalledWith(1, {
      executionId: 'execution-1',
      type: 'STARTED',
      sequence: 0,
      payload: {},
    });
    expect(eventRepository.save).toHaveBeenNthCalledWith(2, {
      executionId: 'execution-1',
      type: 'TOKEN',
      sequence: 1,
      payload: { text: 'Hola' },
    });
  });
});
