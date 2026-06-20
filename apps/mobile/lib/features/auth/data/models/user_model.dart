import 'package:kyrae_mobile/features/auth/domain/entities/user.dart';

class UserModel extends User {
  const UserModel({
    required super.id,
    required super.email,
    required super.firstName,
    required super.firstSurname,
    super.secondSurname,
    required super.fullName,
    required super.roles,
    required super.permissions,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      firstName: json['firstName'] as String,
      firstSurname: json['firstSurname'] as String,
      secondSurname: json['secondSurname'] as String?,
      fullName: json['fullName'] as String,
      roles: (json['roles'] as List<dynamic>).cast<String>(),
      permissions: (json['permissions'] as List<dynamic>).cast<String>(),
    );
  }
}
