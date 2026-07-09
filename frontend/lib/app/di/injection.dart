import 'package:get_it/get_it.dart';

/// Service locator (get_it + injectable).
/// Run `flutter pub run build_runner build` to generate `injection.config.dart`
/// once @injectable-annotated classes exist.
///
/// Structure only.
final GetIt getIt = GetIt.instance;

Future<void> configureDependencies() async {
  // injectable-generated init call goes here once features are implemented.
}
