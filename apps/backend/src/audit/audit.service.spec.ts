import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditEvent } from './audit-event.entity';
import { AuditService } from './audit.service';
import { User } from '../users/user.entity';

type MockQueryBuilder = {
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  take: jest.Mock;
  getMany: jest.Mock;
};

function mockQueryBuilder(): MockQueryBuilder {
  return {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
}

function makeEvent(overrides: Partial<AuditEvent>): AuditEvent {
  return {
    id: 'id',
    action: 'AUTH_LOGIN_SUCCESS',
    actorUserId: null,
    targetUserId: null,
    resourceType: null,
    resourceId: null,
    metadata: null,
    ipAddress: null,
    userAgent: null,
    severity: 'INFO',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('AuditService', () => {
  let service: AuditService;
  let auditRepository: Record<string, jest.Mock>;
  let userRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    auditRepository = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    userRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditEvent),
          useValue: auditRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return first page without cursor', async () => {
      const now = new Date();
      const events = Array.from({ length: 20 }, (_, i) =>
        makeEvent({ id: `id-${i}`, createdAt: new Date(now.getTime() - i * 1000) })
      );

      const qb = mockQueryBuilder();
      qb.getMany.mockResolvedValue(events);
      auditRepository.createQueryBuilder.mockReturnValue(qb);
      userRepository.find.mockResolvedValue([]);

      const result = await service.findAll({ limit: 20 });

      expect(qb.orderBy).toHaveBeenCalledWith('audit.createdAt', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('audit.id', 'DESC');
      expect(qb.take).toHaveBeenCalledWith(21);
      expect(result.data).toHaveLength(20);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should cap limit at 100', async () => {
      const qb = mockQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      auditRepository.createQueryBuilder.mockReturnValue(qb);
      userRepository.find.mockResolvedValue([]);

      const result = await service.findAll({ limit: 999 });

      expect(qb.take).toHaveBeenCalledWith(101);
      expect(result.data).toHaveLength(0);
    });

    it('should use default limit of 20 when not provided', async () => {
      const qb = mockQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      auditRepository.createQueryBuilder.mockReturnValue(qb);
      userRepository.find.mockResolvedValue([]);

      await service.findAll({});

      expect(qb.take).toHaveBeenCalledWith(21);
    });

    it('should apply cursor when provided', async () => {
      const event = makeEvent({
        id: 'id-0',
        createdAt: new Date('2025-01-01T00:00:00Z'),
      });

      const qb = mockQueryBuilder();
      qb.getMany.mockResolvedValue([event]);
      auditRepository.createQueryBuilder.mockReturnValue(qb);
      userRepository.find.mockResolvedValue([]);

      const cursor = Buffer.from(
        JSON.stringify({ createdAt: '2025-01-01T00:00:00Z', id: 'prev-id' }),
        'utf8'
      ).toString('base64url');

      const result = await service.findAll({ limit: 20, cursor });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(audit.createdAt < :cursorCreatedAt OR (audit.createdAt = :cursorCreatedAt AND audit.id < :cursorId))',
        expect.objectContaining({
          cursorCreatedAt: expect.any(Date),
          cursorId: 'prev-id',
        })
      );
      expect(result.data).toHaveLength(1);
    });

    it('should set hasMore when more records exist', async () => {
      const now = new Date();
      const events = Array.from({ length: 21 }, (_, i) =>
        makeEvent({ id: `id-${i}`, createdAt: new Date(now.getTime() - i * 1000) })
      );

      const qb = mockQueryBuilder();
      qb.getMany.mockResolvedValue(events);
      auditRepository.createQueryBuilder.mockReturnValue(qb);
      userRepository.find.mockResolvedValue([]);

      const result = await service.findAll({ limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).not.toBeNull();
    });

    it('should throw BadRequestException for invalid cursor', async () => {
      await expect(service.findAll({ limit: 20, cursor: 'invalid-base64' })).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for malformed cursor JSON', async () => {
      const malformed = Buffer.from('not-json', 'utf8').toString('base64url');
      await expect(service.findAll({ limit: 20, cursor: malformed })).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for cursor with missing fields', async () => {
      const noFields = Buffer.from(JSON.stringify({ foo: 'bar' }), 'utf8').toString('base64url');
      await expect(service.findAll({ limit: 20, cursor: noFields })).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('log', () => {
    it('should create and return an audit event', async () => {
      const saved = makeEvent({
        id: 'new-id',
        action: 'USER_CREATED',
        actorUserId: 'actor-1',
        resourceType: 'USER',
        ipAddress: '127.0.0.1',
      });

      auditRepository.create.mockReturnValue(saved);
      auditRepository.save.mockResolvedValue(saved);
      userRepository.find.mockResolvedValue([]);

      const result = await service.log({
        action: 'USER_CREATED',
        actorUserId: 'actor-1',
        resourceType: 'USER',
        ipAddress: '127.0.0.1',
      });

      expect(result.action).toBe('USER_CREATED');
      expect(result.id).toBe('new-id');
    });
  });
});
