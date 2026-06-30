import 'package:equatable/equatable.dart';

class User extends Equatable {
  const User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.firstSurname,
    this.secondSurname,
    required this.fullName,
    required this.roles,
    required this.permissions,
  });

  final String id;
  final String email;
  final String firstName;
  final String firstSurname;
  final String? secondSurname;
  final String fullName;
  final List<String> roles;
  final List<String> permissions;

  @override
  List<Object?> get props => [
    id,
    email,
    firstName,
    firstSurname,
    secondSurname,
    fullName,
    roles,
    permissions,
  ];
}
