class Validators {
  static String? email(String value) {
    const pattern =
        r"^[a-zA-Z0-9.!#$%&'*+\-/=?^_`{|}~]+@[a-zA-Z0-9]+\.[a-zA-Z]+";
    final regex = RegExp(pattern);

    if (value.isEmpty) {
      return 'El email es obligatorio';
    }

    if (!regex.hasMatch(value)) {
      return 'El email no es válido';
    }

    return null;
  }

  static String? password(String value) {
    if (value.isEmpty) {
      return 'La contraseña es obligatoria';
    }

    if (value.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }

    return null;
  }
}
