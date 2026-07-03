import * as bcrypt from 'bcrypt';
import dataSource from './data-source';
import { Branch } from '../branches/branch.entity';
import { UserBranch } from '../branches/user-branch.entity';
import { AppConfig } from '../configuration/app-config.entity';
import { Organization } from '../organizations/organization.entity';
import { UserOrganization } from '../organizations/user-organization.entity';
import { Permission } from '../permissions/permission.entity';
import { Role } from '../roles/role.entity';
import { User } from '../users/user.entity';

const DEFAULT_PERMISSIONS = [
  'USERS_READ',
  'USERS_CREATE',
  'USERS_UPDATE',
  'USERS_DELETE',
  'ROLES_READ',
  'ROLES_CREATE',
  'ROLES_UPDATE',
  'ROLES_DELETE',
  'PERMISSIONS_READ',
  'PERMISSIONS_CREATE',
  'PERMISSIONS_UPDATE',
  'PERMISSIONS_DELETE',
  'AUDIT_READ',
  'ORGANIZATIONS_READ',
  'ORGANIZATIONS_CREATE',
  'ORGANIZATIONS_UPDATE',
  'ORGANIZATIONS_DELETE',
  'BRANCHES_READ',
  'BRANCHES_CREATE',
  'BRANCHES_UPDATE',
  'BRANCHES_DELETE',
  'CONFIGURATION_READ',
  'CONFIGURATION_CREATE',
  'CONFIGURATION_UPDATE',
  'CONFIGURATION_DELETE',
  'ASSISTANT_CHAT_USE',
  'ASSISTANT_VOICE_USE',
  'ASSISTANT_VOICE_OUTPUT_USE',
];

async function seed(): Promise<void> {
  await dataSource.initialize();

  const permissionRepository = dataSource.getRepository(Permission);
  const roleRepository = dataSource.getRepository(Role);
  const userRepository = dataSource.getRepository(User);
  const orgRepository = dataSource.getRepository(Organization);
  const branchRepository = dataSource.getRepository(Branch);
  const userOrgRepository = dataSource.getRepository(UserOrganization);
  const userBranchRepository = dataSource.getRepository(UserBranch);
  const configRepository = dataSource.getRepository(AppConfig);

  const permissions: Permission[] = [];

  for (const permissionName of DEFAULT_PERMISSIONS) {
    let permission = await permissionRepository.findOne({
      where: { name: permissionName },
    });
    if (!permission) {
      permission = await permissionRepository.save(
        permissionRepository.create({
          name: permissionName,
          description: `Allows ${permissionName}`,
        })
      );
    }
    permissions.push(permission);
  }

  let adminRole = await roleRepository.findOne({ where: { name: 'admin' } });
  if (!adminRole) {
    adminRole = roleRepository.create({
      name: 'admin',
      description: 'Full access role',
      permissions,
    });
  } else {
    adminRole.permissions = permissions;
  }
  adminRole = await roleRepository.save(adminRole);

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@softmaking.cl';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';

  let adminUser = await userRepository.findOne({
    where: { email: adminEmail },
  });
  if (!adminUser) {
    adminUser = userRepository.create({
      email: adminEmail,
      firstName: 'Admin',
      firstSurname: 'istrator',
      passwordHash: await bcrypt.hash(adminPassword, 10),
      isActive: true,
      provider: 'LOCAL',
      roles: [adminRole],
    });
  } else {
    adminUser.provider = adminUser.provider ?? 'LOCAL';
    adminUser.roles = [adminRole];
  }

  adminUser = await userRepository.save(adminUser);

  let defaultOrg = await orgRepository.findOne({ where: { code: 'DEFAULT' } });
  if (!defaultOrg) {
    defaultOrg = await orgRepository.save(
      orgRepository.create({
        code: 'DEFAULT',
        name: 'Default Organization',
        description: 'Default organization for the archetype',
        isActive: true,
      })
    );
  }

  let defaultBranch = await branchRepository.findOne({
    where: { code: 'MAIN', organizationId: defaultOrg.id },
  });
  if (!defaultBranch) {
    defaultBranch = await branchRepository.save(
      branchRepository.create({
        organizationId: defaultOrg.id,
        code: 'MAIN',
        name: 'Main Branch',
        description: 'Main branch of the default organization',
        isActive: true,
      })
    );
  }

  const existingUserOrg = await userOrgRepository.findOne({
    where: { userId: adminUser.id, organizationId: defaultOrg.id },
  });
  if (!existingUserOrg) {
    await userOrgRepository.save(
      userOrgRepository.create({
        userId: adminUser.id,
        organizationId: defaultOrg.id,
      })
    );
  }

  const existingUserBranch = await userBranchRepository.findOne({
    where: { userId: adminUser.id, branchId: defaultBranch.id },
  });
  if (!existingUserBranch) {
    await userBranchRepository.save(
      userBranchRepository.create({
        userId: adminUser.id,
        branchId: defaultBranch.id,
      })
    );
  }

  const defaultConfigs = [
    {
      key: 'app.name',
      value: 'Kyrae',
      description: 'Public application name',
      isActive: true,
      category: 'app',
    },
    {
      key: 'app.maintenance',
      value: false,
      description: 'Controls maintenance mode state',
      isActive: true,
      category: 'app',
    },
  ];

  for (const defaultConfig of defaultConfigs) {
    const existingConfig = await configRepository.findOne({
      where: { key: defaultConfig.key },
    });

    if (!existingConfig) {
      await configRepository.save(configRepository.create(defaultConfig));
    }
  }

  await dataSource.destroy();
}

seed()
  .then(() => {
    console.log('Seed executed successfully');
  })
  .catch((error: unknown) => {
    console.error('Seed failed', error);
    process.exit(1);
  });
