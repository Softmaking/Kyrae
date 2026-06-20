import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { UserOrganization } from '../organizations/user-organization.entity';
import { Branch } from './branch.entity';
import { UserBranch } from './user-branch.entity';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Branch, UserBranch, UserOrganization, User]), AuditModule],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
