import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import type { AgentProviderType } from '@kyrae/shared-contracts';
import { AgentProvider } from './agent-provider';

export const AGENT_PROVIDERS = Symbol('AGENT_PROVIDERS');

@Injectable()
export class AgentProviderFactory {
  private readonly providers = new Map<AgentProviderType, AgentProvider>();

  constructor(@Inject(AGENT_PROVIDERS) providers: AgentProvider[]) {
    for (const provider of providers) this.providers.set(provider.getType(), provider);
  }

  get(providerType: AgentProviderType): AgentProvider {
    const provider = this.providers.get(providerType);
    if (!provider)
      throw new UnprocessableEntityException('El proveedor de agente no está disponible.');
    return provider;
  }
}
