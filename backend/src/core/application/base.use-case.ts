/**
 * Base use case contract (Application layer).
 * Every application-layer use case implements a single `execute` method,
 * keeping business operations explicit, testable, and framework-free.
 */
export interface IUseCase<TRequest, TResponse> {
  execute(request: TRequest): Promise<TResponse>;
}
