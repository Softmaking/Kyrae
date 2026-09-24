import { AgentProviderFactory } from './agent-provider.factory';

describe('AgentProviderFactory', () => {
  it('resolves registered providers by type', () => {
    const hermes = { getType: () => 'HERMES' } as any;
    const openClaw = { getType: () => 'OPENCLAW' } as any;
    const factory = new AgentProviderFactory([hermes, openClaw]);

    expect(factory.get('HERMES')).toBe(hermes);
    expect(factory.get('OPENCLAW')).toBe(openClaw);
  });

  it('does not silently fallback when a provider is unavailable', () => {
    const factory = new AgentProviderFactory([]);

    expect(() => factory.get('HERMES')).toThrow('El proveedor de agente no está disponible.');
  });
});
