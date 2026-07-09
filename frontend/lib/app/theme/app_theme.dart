import 'package:flutter/material.dart';

/// Centralized Material 3 theming (light/dark).
/// Structure only — tokens (colors, typography) to be defined with
/// the brand design system.
class AppTheme {
  AppTheme._();

  static ThemeData get light => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        fontFamily: 'Cairo',
      );

  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        fontFamily: 'Cairo',
      );
}
