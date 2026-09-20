export type RunEndedPayload = {
  score: number;
  outcome: 'win' | 'lose';
  isNewRecord?: boolean;
};

export interface AdService {
  onRunEnded(payload: RunEndedPayload): void;
}

export interface PurchaseService {
  onRunEnded(payload: RunEndedPayload): void;
}

export interface AccountService {
  onRunEnded(payload: RunEndedPayload): void;
}
