export interface EssentialUseCase {
  id: string;
  essentialUseCase: EssentialUseCaseRows[];
}

export interface EssentialUseCaseRows {
  usersPurpose: string;
  systemResponsibility: string;
}
