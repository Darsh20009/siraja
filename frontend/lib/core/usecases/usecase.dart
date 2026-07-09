import 'package:dartz/dartz.dart';
import '../errors/failures.dart';

/// Base use case contract (Clean Architecture), mirrored from the backend's
/// IUseCase so both layers speak the same conceptual language.
abstract class UseCase<Type, Params> {
  Future<Either<Failure, Type>> call(Params params);
}

class NoParams {
  const NoParams();
}
