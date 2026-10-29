import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsModule } from '../agents/agents.module';
import { AuditModule } from '../audit/audit.module';
import { ATTACHMENT_ENTITIES } from './attachment.entities';
import { AssistantAttachmentsController } from './assistant-attachments.controller';
import { AssistantAttachmentsService } from './assistant-attachments.service';
import { AssistantAccessPolicy } from './assistant-access-policy.service';
import { FilesystemAttachmentStorage } from './filesystem-attachment-storage.service';
import { AttachmentMultipartService } from './attachment-multipart.service';
import { AttachmentJobsService } from './attachment-jobs.service';
import { AttachmentCleanupService } from './attachment-cleanup.service';

@Module({
  imports: [TypeOrmModule.forFeature(ATTACHMENT_ENTITIES), AgentsModule, AuditModule],
  controllers: [AssistantAttachmentsController],
  providers: [
    AssistantAttachmentsService,
    AssistantAccessPolicy,
    FilesystemAttachmentStorage,
    AttachmentMultipartService,
    AttachmentJobsService,
    AttachmentCleanupService,
  ],
  exports: [
    AssistantAttachmentsService,
    AssistantAccessPolicy,
    FilesystemAttachmentStorage,
    AttachmentJobsService,
    TypeOrmModule,
  ],
})
export class AssistantAttachmentsModule {}
