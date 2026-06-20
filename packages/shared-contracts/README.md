# Shared Contracts

Contratos TypeScript compartidos entre frontend y backend.

Este paquete es la fuente de verdad para DTOs, queries, responses y tipos que cruzan el límite entre aplicaciones.

## Estructura

```
packages/shared-contracts/
├── src/
│   ├── index.ts       # Exporta todos los contratos públicos
│   ├── auth/          # Contratos de autenticación
│   ├── audit/         # Contratos de auditoría
│   ├── branches/      # Contratos de sucursales
│   ├── common/        # Contratos comunes
│   ├── organizations/ # Contratos de organizaciones
│   ├── permissions/   # Códigos de permisos
│   ├── roles/         # Contratos de roles
│   ├── configuration/ # Contratos de configuracion
│   └── users/         # Contratos de usuarios
├── package.json
└── tsconfig.json
```

## Contratos actuales

### Auditoría

Archivo principal:

```txt
src/audit/audit.contracts.ts
```

Exporta:

```txt
AuditSeverities
AuditSeverity
AuditActions
AuditAction
AuditResourceType
AuditEventDto
CreateAuditEventCommand
ListAuditEventsQuery
ListAuditEventsResponse
```

`ListAuditEventsQuery` usa `limit`, `cursor` opcional y los filtros de auditoría existentes. `ListAuditEventsResponse` responde con `data`, `nextCursor` y `hasMore`.

### Autenticación

```txt
LoginRequestDto
RefreshTokenCommand
AuthenticatedUserDto
LoginResponseDto
JwtPayloadDto
```

### Organizaciones y sucursales

```txt
OrganizationDto
CreateOrganizationCommand
UpdateOrganizationCommand
AssignUserToOrganizationCommand
BranchDto
CreateBranchCommand
UpdateBranchCommand
ListBranchesQuery
AssignUserToBranchCommand
```

### Usuarios, permisos y comunes

```txt
UserDto
CreateUserCommand
UpdateUserCommand
RoleDto
CreateRoleCommand
UpdateRoleCommand
AppConfigDto
CreateAppConfigCommand
UpdateAppConfigCommand
ListAppConfigsQuery
CommandResponse
HealthResponseDto
ReadinessResponseDto
ReadinessErrorResponseDto
PaginatedResponse
CursorPaginatedResponse
```

## Uso

```typescript
// Frontend
import type { ListAuditEventsResponse } from '@kyrae/shared-contracts';

// Backend
import type { CreateAuditEventCommand } from '@kyrae/shared-contracts';
```

## Reglas

- Mantener este paquete libre de Angular, NestJS, TypeORM y cualquier framework.
- No agregar lógica de negocio, acceso a base de datos, configuración de entorno ni secretos.
- Usar `interface`, `type` y constantes serializables.
- Los DTOs backend pueden implementar contratos compartidos, pero la validación con decorators debe quedar en backend.
- Las entidades de base de datos no son contratos API.
- Todo cambio que afecte frontend y backend debe revisar primero este paquete.
- Los permisos se representan como strings estables en formato `MODULE_ACTION`.
- El catalogo efectivo de permisos vive en backend/base de datos/seed; este paquete no mantiene un catalogo global de constantes de permisos.

## Flujo recomendado

1. Definir o actualizar el contrato compartido.
2. Alinear DTOs y responses backend.
3. Alinear modelos y servicios frontend.
4. Actualizar documentación en `docs/architecture` o `docs/standards`.
5. Ejecutar builds relevantes.
