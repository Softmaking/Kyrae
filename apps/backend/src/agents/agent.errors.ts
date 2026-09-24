import {
  BadGatewayException,
  GatewayTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';

export class AgentProviderError extends BadGatewayException {
  constructor(message = 'El proveedor de agente devolvió un error.') {
    super({ code: 'AGENT_PROVIDER_ERROR', message });
  }
}

export class AgentProviderUnavailableError extends ServiceUnavailableException {
  constructor(message = 'El proveedor de agente no está disponible.') {
    super({ code: 'AGENT_PROVIDER_UNAVAILABLE', message });
  }
}

export class AgentTimeoutError extends GatewayTimeoutException {
  constructor() {
    super({
      code: 'AGENT_TIMEOUT',
      message: 'El proveedor de agente tardó demasiado en responder.',
    });
  }
}
