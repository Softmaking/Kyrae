import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { OpenClawModule } from '../openclaw/openclaw.module';
import { Agent } from './agent.entity';
import { AgentExecutionEvent } from './agent-execution-event.entity';
import { AgentExecution } from './agent-execution.entity';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { AgentProviderFactory, AGENT_PROVIDERS } from './agent-provider.factory';
import { HermesAgentProvider } from './hermes-agent.provider';
import { OpenClawAgentProvider } from './openclaw-agent.provider';
import { AgentsController } from './agents.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, AgentExecution, AgentExecutionEvent]),
    AuditModule,
    OpenClawModule,
  ],
  providers: [
    HermesAgentProvider,
    OpenClawAgentProvider,
    {
      provide: AGENT_PROVIDERS,
      inject: [HermesAgentProvider, OpenClawAgentProvider],
      useFactory: (hermes: HermesAgentProvider, openClaw: OpenClawAgentProvider) => [
        hermes,
        openClaw,
      ],
    },
    AgentProviderFactory,
    AgentOrchestratorService,
  ],
  controllers: [AgentsController],
  exports: [
    AgentOrchestratorService,
    AgentProviderFactory,
    HermesAgentProvider,
    OpenClawAgentProvider,
  ],
})
export class AgentsModule {}
