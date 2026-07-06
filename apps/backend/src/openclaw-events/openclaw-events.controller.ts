import type { OpenClawAutomationEventResponse } from '@kyrae/shared-contracts';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { OpenClawAutomationEventDto } from './dto/openclaw-automation-event.dto';
import { OpenClawEventsApiKeyGuard } from './guards/openclaw-events-api-key.guard';
import { OpenClawEventsService } from './openclaw-events.service';

@Controller('openclaw/events')
@UseGuards(OpenClawEventsApiKeyGuard)
export class OpenClawEventsController {
  constructor(private readonly openClawEventsService: OpenClawEventsService) {}

  @Post()
  async receiveEvent(
    @Body() dto: OpenClawAutomationEventDto
  ): Promise<OpenClawAutomationEventResponse> {
    return this.openClawEventsService.receiveEvent(dto);
  }
}
