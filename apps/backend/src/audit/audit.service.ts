import type {
  AuditEventDto,
  ListAuditEventsQuery,
  ListAuditEventsResponse,
} from '@kyrae/shared-contracts';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditEvent } from './audit-event.entity';
import { CreateAuditEventDto } from './dto/create-audit-event.dto';
import { User } from '../users/user.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEvent)
    private readonly auditRepository: Repository<AuditEvent>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async log(dto: CreateAuditEventDto): Promise<AuditEventDto> {
    const event = this.auditRepository.create(dto);
    const saved = await this.auditRepository.save(event);
    return this.toDto(saved, new Map());
  }

  async findAll(filters: ListAuditEventsQuery): Promise<ListAuditEventsResponse> {
    const qb = this.auditRepository.createQueryBuilder('audit');

    if (filters.action) {
      qb.andWhere('audit.action = :action', { action: filters.action });
    }
    if (filters.actorUserId) {
      qb.andWhere('audit.actorUserId = :actorUserId', {
        actorUserId: filters.actorUserId,
      });
    }
    if (filters.targetUserId) {
      qb.andWhere('audit.targetUserId = :targetUserId', {
        targetUserId: filters.targetUserId,
      });
    }
    if (filters.resourceType) {
      qb.andWhere('audit.resourceType = :resourceType', {
        resourceType: filters.resourceType,
      });
    }
    if (filters.resourceId) {
      qb.andWhere('audit.resourceId = :resourceId', {
        resourceId: filters.resourceId,
      });
    }
    if (filters.severity) {
      qb.andWhere('audit.severity = :severity', { severity: filters.severity });
    }
    if (filters.dateFrom) {
      qb.andWhere('audit.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }
    if (filters.dateTo) {
      qb.andWhere('audit.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }

    const limit = Math.min(filters.limit ?? 20, 100);
    const cursor = filters.cursor ? this.decodeCursor(filters.cursor) : null;

    if (cursor) {
      qb.andWhere(
        '(audit.createdAt < :cursorCreatedAt OR (audit.createdAt = :cursorCreatedAt AND audit.id < :cursorId))',
        {
          cursorCreatedAt: cursor.createdAt,
          cursorId: cursor.id,
        }
      );
    }

    qb.orderBy('audit.createdAt', 'DESC')
      .addOrderBy('audit.id', 'DESC')
      .take(limit + 1);

    const results = await qb.getMany();
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;
    const userMap = await this.getUserMap(data);
    const lastEvent = data.at(-1);

    return {
      data: data.map((event) => this.toDto(event, userMap)),
      nextCursor: hasMore && lastEvent ? this.encodeCursor(lastEvent) : null,
      hasMore,
    };
  }

  async findOne(id: string): Promise<AuditEventDto | null> {
    const event = await this.auditRepository.findOne({ where: { id } });
    if (!event) return null;

    const userMap = await this.getUserMap([event]);
    return this.toDto(event, userMap);
  }

  async countRecentEvents(params: {
    action: string;
    windowMinutes: number;
    ipAddress?: string;
    actorUserId?: string;
  }): Promise<number> {
    const qb = this.auditRepository
      .createQueryBuilder('audit')
      .where('audit.action = :action', { action: params.action })
      .andWhere('audit.createdAt >= :windowStart', {
        windowStart: this.getWindowStart(params.windowMinutes),
      });

    if (params.ipAddress) {
      qb.andWhere('audit.ipAddress = :ipAddress', { ipAddress: params.ipAddress });
    }

    if (params.actorUserId) {
      qb.andWhere('audit.actorUserId = :actorUserId', { actorUserId: params.actorUserId });
    }

    return qb.getCount();
  }

  async countDistinctRecentLoginIdentifiersByIp(params: {
    action: string;
    windowMinutes: number;
    ipAddress: string;
  }): Promise<number> {
    const result = await this.auditRepository
      .createQueryBuilder('audit')
      .select(
        "COUNT(DISTINCT COALESCE(audit.actor_user_id::text, audit.metadata->>'email'))",
        'count'
      )
      .where('audit.action = :action', { action: params.action })
      .andWhere('audit.createdAt >= :windowStart', {
        windowStart: this.getWindowStart(params.windowMinutes),
      })
      .andWhere('audit.ipAddress = :ipAddress', { ipAddress: params.ipAddress })
      .getRawOne<{ count: string }>();

    return Number(result?.count ?? 0);
  }

  private getWindowStart(windowMinutes: number): Date {
    return new Date(Date.now() - windowMinutes * 60 * 1000);
  }

  private encodeCursor(event: AuditEvent): string {
    return Buffer.from(
      JSON.stringify({ createdAt: event.createdAt.toISOString(), id: event.id }),
      'utf8'
    ).toString('base64url');
  }

  private decodeCursor(cursor: string): { createdAt: Date; id: string } {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
        createdAt?: unknown;
        id?: unknown;
      };

      if (typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') {
        throw new Error('Invalid cursor shape');
      }

      const createdAt = new Date(parsed.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        throw new Error('Invalid cursor date');
      }

      return { createdAt, id: parsed.id };
    } catch {
      throw new BadRequestException('Invalid audit cursor');
    }
  }

  private async getUserMap(
    events: AuditEvent[]
  ): Promise<Map<string, { email: string; fullName: string }>> {
    const ids = new Set<string>();
    for (const e of events) {
      if (e.actorUserId) ids.add(e.actorUserId);
      if (e.targetUserId) ids.add(e.targetUserId);
    }

    if (ids.size === 0) return new Map();

    const users = await this.userRepository.find({
      where: { id: In([...ids]) },
      select: ['id', 'email', 'fullName'],
    });

    return new Map(users.map((u) => [u.id, { email: u.email, fullName: u.fullName }]));
  }

  private toDto(
    event: AuditEvent,
    userMap: Map<string, { email: string; fullName: string }>
  ): AuditEventDto {
    const actor = event.actorUserId ? userMap.get(event.actorUserId) : undefined;
    const target = event.targetUserId ? userMap.get(event.targetUserId) : undefined;

    return {
      id: event.id,
      action: event.action,
      actorUserId: event.actorUserId ?? null,
      actorUserEmail: actor?.email ?? null,
      actorUserName: actor?.fullName ?? null,
      targetUserId: event.targetUserId ?? null,
      targetUserEmail: target?.email ?? null,
      targetUserName: target?.fullName ?? null,
      resourceType: event.resourceType ?? null,
      resourceId: event.resourceId ?? null,
      metadata: event.metadata ?? null,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
      severity:
        event.severity === 'WARNING' || event.severity === 'ERROR' || event.severity === 'CRITICAL'
          ? event.severity
          : 'INFO',
      createdAt: event.createdAt.toISOString(),
    };
  }
}
