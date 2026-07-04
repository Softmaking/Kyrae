import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Permission } from '../permissions/permission.entity';
import { Role } from '../roles/role.entity';
import { User } from '../users/user.entity';
import { AuditEvent } from '../audit/audit-event.entity';
import { Organization } from '../organizations/organization.entity';
import { UserOrganization } from '../organizations/user-organization.entity';
import { Branch } from '../branches/branch.entity';
import { UserBranch } from '../branches/user-branch.entity';
import { AppConfig } from '../configuration/app-config.entity';
import { Conversation } from '../messages/conversation.entity';
import { AssistantMessageTask } from '../messages/assistant-message-task.entity';
import { Message } from '../messages/message.entity';
import { OpenClawRequestTrace } from '../messages/openclaw-request.entity';
import { VoiceEvent } from '../voice/voice-event.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_NAME ?? 'kyrae',
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
    Conversation,
    AssistantMessageTask,
    Message,
    OpenClawRequestTrace,
    VoiceEvent,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
