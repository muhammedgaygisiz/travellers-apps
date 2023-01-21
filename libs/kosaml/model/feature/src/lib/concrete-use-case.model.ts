export interface ConcreteUseCase {
  id: string;
  concreteUseCase: ConcreteUseCaseRows[];
}

export interface ConcreteUseCaseRows {
  userAction: string;
  systemResponse: string;
}
