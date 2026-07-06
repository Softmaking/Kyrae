import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from './audit/audit.module';
import { AutomationSchedulesModule } from './automation-schedules/automation-schedules.module';
import { AuthModule } from './auth/auth.module';
import { BranchesModule } from './branches/branches.module';
import { HealthModule } from './health/health.module';
import { MessagesModule } from './messages/messages.module';
import { OpenClawEventsModule } from './openclaw-events/openclaw-events.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { RolesModule } from './roles/roles.module';
import { SecurityModule } from './security/security.module';
import { UsersModule } from './users/users.module';
import { VoiceModule } from './voice/voice.module';
import { typeOrmConfig } from './database/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ConfigurationModule,
    AuditModule,
    AutomationSchedulesModule,
    OrganizationsModule,
    BranchesModule,
    MessagesModule,
    OpenClawEventsModule,
    VoiceModule,
    SecurityModule,
  ],
})
export class AppModule {}
