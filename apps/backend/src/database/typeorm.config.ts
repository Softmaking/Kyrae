import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { AuditEvent } from '../audit/audit-event.entity';
import { Branch } from '../branches/branch.entity';
import { UserBranch } from '../branches/user-branch.entity';
import { AppConfig } from '../configuration/app-config.entity';
import { Conversation } from '../messages/conversation.entity';
import { AssistantMessageTask } from '../messages/assistant-message-task.entity';
import { Message } from '../messages/message.entity';
import { OpenClawRequestTrace } from '../messages/openclaw-request.entity';
import { AutomationSchedule } from '../automation-schedules/automation-schedule.entity';
import { OpenClawEvent } from '../openclaw-events/openclaw-event.entity';
import { Organization } from '../organizations/organization.entity';
import { UserOrganization } from '../organizations/user-organization.entity';
import { Permission } from '../permissions/permission.entity';
import { Role } from '../roles/role.entity';
import { User } from '../users/user.entity';
import { VoiceEvent } from '../voice/voice-event.entity';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 5432),
    username: config.get<string>('DB_USER', 'postgres'),
    password: config.get<string>('DB_PASS', 'postgres'),
    database: config.get<string>('DB_NAME', 'kyrae'),
    entities: [
      User,
      Role,
      Permission,
      AuditEvent,
      Organization,
      UserOrganization,
      Branch,
      UserBranch,
      AppConfig,
      AutomationSchedule,
      Conversation,
      AssistantMessageTask,
      Message,
      OpenClawRequestTrace,
      OpenClawEvent,
      VoiceEvent,
    ],
    synchronize: false,
  }),
};
