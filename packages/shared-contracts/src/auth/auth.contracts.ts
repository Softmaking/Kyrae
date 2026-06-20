export const AuthProvider = {
  LOCAL: 'LOCAL',
  MICROSOFT: 'MICROSOFT',
  GOOGLE: 'GOOGLE',
} as const;

export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider];

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RefreshTokenCommand {
  refreshToken: string;
}

export interface AuthenticatedUserDto {
  id: string;
  email: string;
  firstName: string;
  firstSurname: string;
  secondSurname?: string;
  fullName: string;
  provider?: AuthProvider;
  roles: string[];
  permissions: string[];
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer' | string;
  user: AuthenticatedUserDto;
}

export interface JwtPayloadDto {
  sub: string;
  email: string;
  provider?: AuthProvider;
  roles: string[];
  permissions: string[];
}
