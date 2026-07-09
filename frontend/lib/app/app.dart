import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'theme/app_theme.dart';

/// Root widget.
///
/// - Material 3 (see theme/app_theme.dart)
/// - RTL-first: Arabic is the primary locale; layout mirrors automatically
///   via Directionality/Localizations for LTR locales (e.g. English).
/// - Routing wired via app/routes (go_router) once screens exist.
///
/// Structure only.
class SirajaApp extends StatelessWidget {
  const SirajaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Siraja',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      locale: const Locale('ar'),
      supportedLocales: const [Locale('ar'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const SizedBox.shrink(), // replaced by router once implemented
    );
  }
}
