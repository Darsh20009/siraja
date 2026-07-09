import 'package:flutter/material.dart';
import 'app/app.dart';

/// Entry point. Dependency injection bootstrap (app/di) and any
/// platform initialization will be wired here once features land.
///
/// Structure only.
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SirajaApp());
}
