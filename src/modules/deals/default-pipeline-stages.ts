export interface DefaultPipelineStageSeed {
  name: string;
  order: number;
  isWon: boolean;
  isLost: boolean;
}

/** Seeded onto every new Organization at signup (see AuthService.signup). */
export const DEFAULT_PIPELINE_STAGES: DefaultPipelineStageSeed[] = [
  { name: 'Lead', order: 0, isWon: false, isLost: false },
  { name: 'Contacted', order: 1, isWon: false, isLost: false },
  { name: 'Proposal', order: 2, isWon: false, isLost: false },
  { name: 'Won', order: 3, isWon: true, isLost: false },
  { name: 'Lost', order: 4, isWon: false, isLost: true },
];
