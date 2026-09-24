import type { AgentExecutionDto, AgentExecutionEventDto } from '@kyrae/shared-contracts';
import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { AgentApprovalDto } from './dto/agent-approval.dto';
import { CreateAgentRunDto } from './dto/create-agent-run.dto';
import { AgentSteerDto } from './dto/agent-steer.dto';
import { AgentOrchestratorService } from './agent-orchestrator.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AgentsController {
  constructor(private readonly orchestrator: AgentOrchestratorService) {}

  @Post('agents/:agentId/runs')
  @Permissions('ASSISTANT_CHAT_USE')
  createRun(
    @Param('agentId') agentId: string,
    @Body() dto: CreateAgentRunDto,
    @Req() req: Request & { user: JwtPayload }
  ): Promise<AgentExecutionDto> {
    return this.orchestrator.createRun({
      userId: req.user.sub,
      agentId,
      conversationId: dto.conversationId,
      input: dto.input,
      instructions: dto.instructions,
      ipAddress: req.ip ?? req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('agent-executions/:id')
  @Permissions('ASSISTANT_CHAT_USE')
  findExecution(
    @Param('id') id: string,
    @Req() req: Request & { user: JwtPayload }
  ): Promise<AgentExecutionDto> {
    return this.orchestrator.findExecution(id, req.user.sub);
  }

  @Get('agent-executions/:id/events')
  @Permissions('ASSISTANT_CHAT_USE')
  async streamEvents(
    @Param('id') id: string,
    @Req() req: Request & { user: JwtPayload },
    @Res() response: Response
  ): Promise<void> {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    for await (const event of this.orchestrator.streamRun(id, req.user.sub)) {
      response.write(`event: ${event.type.toLowerCase()}\ndata: ${JSON.stringify(event.data)}\n\n`);
    }
    response.end();
  }

  @Get('agent-executions/:id/events/history')
  @Permissions('ASSISTANT_CHAT_USE')
  findEvents(
    @Param('id') id: string,
    @Req() req: Request & { user: JwtPayload }
  ): Promise<AgentExecutionEventDto[]> {
    return this.orchestrator.findEvents(id, req.user.sub);
  }

  @Post('agent-executions/:id/stop')
  @Permissions('ASSISTANT_CHAT_USE')
  stop(
    @Param('id') id: string,
    @Req() req: Request & { user: JwtPayload }
  ): Promise<AgentExecutionDto> {
    return this.orchestrator.stop(id, req.user.sub);
  }

  @Post('agent-executions/:id/steer')
  @Permissions('ASSISTANT_CHAT_USE')
  steer(
    @Param('id') id: string,
    @Body() dto: AgentSteerDto,
    @Req() req: Request & { user: JwtPayload }
  ): Promise<AgentExecutionDto> {
    return this.orchestrator.steer(id, req.user.sub, dto.instruction);
  }

  @Post('agent-executions/:id/approval')
  @Permissions('ASSISTANT_CHAT_USE')
  approve(
    @Param('id') id: string,
    @Body() dto: AgentApprovalDto,
    @Req() req: Request & { user: JwtPayload }
  ): Promise<AgentExecutionDto> {
    return this.orchestrator.approve(id, req.user.sub, dto);
  }
}
