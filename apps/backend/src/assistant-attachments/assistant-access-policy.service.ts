import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { User } from '../users/user.entity';
import { AuditService } from '../audit/audit.service';
import { attachmentError } from './attachment.errors';
import { Conversation } from '../messages/conversation.entity';

@Injectable()
export class AssistantAccessPolicy {
  constructor(
    private readonly db: DataSource,
    private readonly audit: AuditService
  ) {}

  async assertCurrent(ownerId: string, manager: EntityManager = this.db.manager): Promise<void> {
    const user = await manager
      .getRepository(User)
      .findOne({ where: { id: ownerId }, relations: { roles: { permissions: true } } });
    if (
      !user?.isActive ||
      !user.roles.some((r) => r.permissions.some((p) => p.name === 'ASSISTANT_CHAT_USE'))
    ) {
      await this.audit.log({
        action: 'ASSISTANT_ATTACHMENT_ACCESS_DENIED',
        actorUserId: ownerId,
        resourceType: 'assistant_attachment',
        metadata: { code: 'ATTACHMENT_ACCESS_REVOKED' },
        severity: 'WARNING',
      });
      throw attachmentError('ATTACHMENT_ACCESS_REVOKED', 403);
    }
  }

  async conversation(
    id: string,
    ownerId: string,
    manager: EntityManager = this.db.manager
  ): Promise<Conversation> {
    await this.assertCurrent(ownerId, manager);
    const row = await manager
      .getRepository(Conversation)
      .findOne({ where: { id, userId: ownerId } });
    if (!row) throw new NotFoundException();
    return row;
  }
}
