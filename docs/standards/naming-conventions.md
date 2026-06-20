# Naming Conventions

# Overview

This document defines naming conventions for the Kyrae.

Kyrae is IAM-first, security-first and designed as a generic enterprise foundation.

Consistent naming helps:

- improve readability,
- reduce ambiguity,
- improve AI-assisted development quality,
- keep frontend and backend aligned,
- make generated code easier to review,
- avoid domain-specific assumptions.

---

# General Naming Principles

Names must be:

- clear,
- descriptive,
- consistent,
- easy to search,
- aligned with the module responsibility,
- generic unless a project specification defines otherwise.

Avoid names that are:

- vague,
- abbreviated without reason,
- domain-specific in the Kyrae platform,
- inconsistent with existing modules,
- too broad or too generic.

---

# Language Standard

Use English for:

- folders,
- files,
- classes,
- services,
- DTOs,
- interfaces,
- enums,
- database tables,
- API routes,
- permission codes.

Use Spanish for commit message subjects, following the repository Git workflow.

Documentation may be written in Spanish or English depending on the team, but code naming must remain in English.

---

# Folder Naming

Use kebab-case for folders.

Good examples:

```txt
auth
user-management
role-management
permission-management
shared-contracts
api-contracts
```

Avoid:

```txt
UserManagement
user_management
User_Management
usersModule
```

---

# File Naming

Use kebab-case for files.

Good examples:

```txt
auth.service.ts
users.controller.ts
create-user.dto.ts
permissions.guard.ts
current-user.decorator.ts
jwt-payload.interface.ts
user-status.enum.ts
```

Avoid:

```txt
AuthService.ts
users_controller.ts
CreateUserDto.ts
permissionGuard.ts
```

---

# Frontend Naming

## Components

Use PascalCase for component class names.

```txt
UserCardComponent
RoleFormComponent
PermissionListComponent
AppLayoutComponent
```

Use kebab-case for component file names.

```txt
user-card.component.ts
role-form.component.ts
permission-list.component.ts
app-layout.component.ts
```

## Routes

Use kebab-case for routes.

```txt
/users
/roles
/permissions
/audit-events
/configuration
```

Avoid:

```txt
/getUsers
/UserRoles
/permission_management
```

## Services

Use PascalCase for class names.

```txt
AuthService
UsersService
PermissionsService
SessionService
```

Use kebab-case for file names.

```txt
auth.service.ts
users.service.ts
permissions.service.ts
session.service.ts
```

## Guards

Use PascalCase for guard names.

```txt
AuthGuard
GuestGuard
PermissionGuard
RoleGuard
```

Use kebab-case for file names.

```txt
auth.guard.ts
guest.guard.ts
permission.guard.ts
role.guard.ts
```

## Interceptors

Use PascalCase for interceptor names.

```txt
AuthTokenInterceptor
ErrorInterceptor
LoadingInterceptor
```

Use kebab-case for file names.

```txt
auth-token.interceptor.ts
error.interceptor.ts
loading.interceptor.ts
```

## Signals and State

Use descriptive names.

Examples:

```txt
currentUser
isAuthenticated
userPermissions
selectedBranch
isLoading
```

Avoid unclear names:

```txt
data
info
flag
temp
state1
```

---

# Backend Naming

## Modules

Use PascalCase for NestJS module classes.

```txt
AuthModule
UsersModule
RolesModule
PermissionsModule
AuditModule
```

Use kebab-case for module folders.

```txt
auth
users
roles
permissions
audit
```

## Controllers

Use PascalCase for controller class names.

```txt
AuthController
UsersController
RolesController
PermissionsController
```

Use kebab-case for files.

```txt
auth.controller.ts
users.controller.ts
roles.controller.ts
permissions.controller.ts
```

## Services

Use PascalCase for service class names.

```txt
AuthService
UsersService
RolesService
PermissionsService
AuditService
```

Use kebab-case for files.

```txt
auth.service.ts
users.service.ts
roles.service.ts
permissions.service.ts
audit.service.ts
```

## DTOs

Use PascalCase and action-based names.

```txt
LoginRequestDto
LoginResponseDto
CreateUserDto
UpdateUserDto
AssignRoleDto
AssignPermissionDto
```

Use kebab-case for DTO files.

```txt
login-request.dto.ts
login-response.dto.ts
create-user.dto.ts
update-user.dto.ts
assign-role.dto.ts
assign-permission.dto.ts
```

## Entities

Use PascalCase for entity classes.

```txt
User
Role
Permission
AuditEvent
RefreshToken
```

Use kebab-case for entity files.

```txt
user.entity.ts
role.entity.ts
permission.entity.ts
audit-event.entity.ts
refresh-token.entity.ts
```

## Guards

Use PascalCase for guard classes.

```txt
JwtAuthGuard
PermissionsGuard
RefreshTokenGuard
```

Optional project extension:

```txt
RolesGuard
```

Use kebab-case for files.

```txt
jwt-auth.guard.ts
permissions.guard.ts
refresh-token.guard.ts
```

Optional project extension:

```txt
roles.guard.ts
```

## Decorators

Use PascalCase for decorator names.

```txt
CurrentUser
Permissions
Public
```

Optional project extension:

```txt
Roles
```

Use kebab-case for files.

```txt
current-user.decorator.ts
permissions.decorator.ts
public.decorator.ts
```

Optional project extension:

```txt
roles.decorator.ts
```

---

# Shared Contracts Naming

Shared contracts must use clear and stable names.

## DTOs

```txt
LoginRequestDto
LoginResponseDto
UserResponseDto
RoleResponseDto
PermissionResponseDto
PaginatedResponseDto
```

## Enums

```txt
UserStatus
AuthProvider
PermissionScope
AuditAction
```

## Interfaces

```txt
JwtPayload
CurrentUser
PermissionCheck
PaginatedResult
```

## Files

```txt
login-request.dto.ts
login-response.dto.ts
user-status.enum.ts
jwt-payload.interface.ts
paginated-result.interface.ts
```

---

# API Naming

Use REST-oriented names and kebab-case routes.

Good examples:

```txt
GET    /users
GET    /users/:id
POST   /users
PATCH  /users/:id
POST   /auth/login
POST   /auth/refresh
GET    /audit-events
```

Avoid:

```txt
GET /getUsers
POST /doLogin
POST /manageUser
GET /UserList
```

---

# Permission Naming

Use uppercase snake case.

Recommended pattern:

```txt
MODULE_ACTION
```

Examples:

```txt
USERS_READ
USERS_CREATE
USERS_UPDATE
USERS_DELETE
ROLES_READ
ROLES_CREATE
ROLES_UPDATE
PERMISSIONS_UPDATE
AUDIT_READ
ORGANIZATIONS_UPDATE
```

For scoped permissions:

```txt
MODULE_RESOURCE_ACTION
```

Examples:

```txt
USERS_BRANCH_ASSIGN
ROLES_PERMISSION_ASSIGN
```

Avoid:

```txt
ACCESS
MANAGE
DO_ALL
SUPER_PERMISSION
```

---

# Role Naming

Use uppercase snake case or uppercase simple codes.

Generic examples:

```txt
ADMIN
USER
AUDITOR
MANAGER
```

Avoid project-specific roles in the Kyrae platform unless required by a project specification.

Out-of-scope generic examples:

```txt
POS_CASHIER
INVENTORY_MANAGER
SALES_OPERATOR
```

These belong only to concrete projects.

---

# Database Naming

## Tables

Use snake_case.

```txt
users
roles
permissions
user_roles
role_permissions
refresh_tokens
audit_events
organizations
branches
```

## Columns

Use a consistent strategy per project.

Recommended TypeScript entity properties:

```txt
createdAt
updatedAt
deletedAt
isActive
emailVerified
failedLoginAttempts
lockedUntil
```

Foreign keys:

```txt
userId
roleId
permissionId
organizationId
branchId
```

## Indexes

Use descriptive names.

```txt
idx_users_email
idx_roles_code
idx_permissions_code
idx_audit_events_created_at
idx_audit_events_created_at_id
```

## Unique Constraints

Use descriptive names.

```txt
uq_users_email
uq_roles_code
uq_permissions_code
uq_user_roles_user_role
uq_role_permissions_role_permission
```

---

# Environment Variable Naming

Use uppercase snake case.

Examples:

```txt
DB_HOST
DB_PORT
DB_USER
DB_PASS
DB_NAME
JWT_SECRET
JWT_REFRESH_SECRET
MICROSOFT_CLIENT_ID
GOOGLE_CLIENT_ID
```

Frontend uses Angular environment files under `apps/frontend/src/environments/`.

Frontend API URL key:

```txt
apiBaseUrl
```

Frontend variables must not contain secrets.

---

# Git Naming

## Branches

Use kebab-case.

```txt
feature/auth-login
fix/permission-guard
docs/update-architecture
refactor/auth-service
chore/update-pnpm
```

## Commits

Use Conventional Commits.

```txt
feat(auth): agregar endpoint de login
fix(frontend): corregir redireccion del auth guard
docs(standards): agregar convenciones de nombres
refactor(backend): simplificar servicio de permisos
```

---

# Test Naming

Use descriptive test names.

Recommended pattern:

```txt
should <expected behavior> when <condition>
```

Examples:

```txt
should allow login when credentials are valid
should reject login when user is inactive
should block endpoint when permission is missing
should hide action button when user lacks permission
```

---

# Out of Scope Names

Kyrae platform code and documentation must not include domain-specific naming unless explicitly requested by a project specification.

Avoid Kyrae platform names related to:

- POS,
- inventory,
- sales,
- billing,
- warehouse,
- logistics,
- production workflows,
- customer-specific business processes.

---

# AI Agent Rules

AI agents must follow these rules:

1. Use English names for code artifacts.
2. Use kebab-case for folders and files.
3. Use PascalCase for classes, DTOs, interfaces and enums.
4. Use uppercase snake case for permission codes.
5. Use snake_case for database tables.
6. Do not introduce domain-specific names unless a feature specification explicitly requires them.
7. Keep IAM names generic and reusable.
8. Avoid vague names such as `data`, `item`, `thing`, `manager` without context.
9. Keep names consistent across frontend, backend and shared contracts.
10. Update this document if a new naming convention is introduced.
