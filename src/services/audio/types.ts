export type SfxId =
  | 'paddle_hit'
  | 'brick_chip'
  | 'brick_break'
  | 'powerup_catch'
  | 'life_lost'
  | 'win'
  | 'lose';

export interface AudioService {
  preload(): Promise<void>;
  playBatch(codes: ArrayLike<number>, count: number): void;
  release(): void;
}
