import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from '../audit/audit.service';
import { UserOrganization } from '../organizations/user-organization.entity';
import { User } from '../users/user.entity';
import { Branch } from './branch.entity';
import { BranchesService } from './branches.service';
import { UserBranch } from './user-branch.entity';

describe('BranchesService', () => {
  let service: BranchesService;
  let branchRepository: Record<string, jest.Mock>;
  let userBranchRepository: Record<string, jest.Mock>;
  let userOrganizationRepository: Record<string, jest.Mock>;
  let userRepository: Record<string, jest.Mock>;
  let auditService: Record<string, jest.Mock>;

  beforeEach(async () => {
    branchRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };
    userBranchRepository = {
      create: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    userOrganizationRepository = {
      findOne: jest.fn(),
    };
    userRepository = {
      findOne: jest.fn(),
    };
    auditService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchesService,
        { provide: getRepositoryToken(Branch), useValue: branchRepository },
        { provide: getRepositoryToken(UserBranch), useValue: userBranchRepository },
        {
          provide: getRepositoryToken(UserOrganization),
          useValue: userOrganizationRepository,
        },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<BranchesService>(BranchesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assignUser', () => {
    it('requires the user to belong to the branch organization before branch assignment', async () => {
      branchRepository.findOne.mockResolvedValue(
        makeBranch({ id: 'branch-1', organizationId: 'org-1' })
      );
      userRepository.findOne.mockResolvedValue({ id: 'user-1' });
      userOrganizationRepository.findOne.mockResolvedValue(null);

      await expect(service.assignUser('branch-1', 'user-1', 'actor-1')).rejects.toThrow(
        ConflictException
      );

      expect(userOrganizationRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', organizationId: 'org-1' },
      });
      expect(userBranchRepository.save).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('assigns the user to a branch when the user already belongs to the organization', async () => {
      const branch = makeBranch({ id: 'branch-1', organizationId: 'org-1', code: 'MAIN' });
      const userBranch = { userId: 'user-1', branchId: 'branch-1' };
      branchRepository.findOne.mockResolvedValue(branch);
      userRepository.findOne.mockResolvedValue({ id: 'user-1' });
      userOrganizationRepository.findOne.mockResolvedValue({
        userId: 'user-1',
        organizationId: 'org-1',
      });
      userBranchRepository.findOne.mockResolvedValue(null);
      userBranchRepository.create.mockReturnValue(userBranch);
      userBranchRepository.save.mockResolvedValue(userBranch);

      const result = await service.assignUser('branch-1', 'user-1', 'actor-1');

      expect(result).toEqual(userBranch);
      expect(userBranchRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        branchId: 'branch-1',
      });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          targetUserId: 'user-1',
          resourceType: 'BRANCH',
          resourceId: 'branch-1',
        })
      );
    });
  });
});

function makeBranch(overrides: Partial<Branch>): Branch {
  return {
    id: 'branch-id',
    organizationId: 'organization-id',
    organization: {
      id: 'organization-id',
      code: 'ORG',
      name: 'Organization',
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    code: 'BRANCH',
    name: 'Branch',
    description: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
