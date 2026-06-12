export interface TraitAttribute {
  trait_type: string;
  value: string;
  display_type?: string;
}

export interface NormieTraits {
  raw: string;
  attributes: TraitAttribute[];
}

export interface NormieMetadata {
  name: string;
  attributes: TraitAttribute[];
  image?: string;
  animation_url?: string;
}

export interface NormieOwner {
  tokenId: string;
  owner: string;
}

export interface NormieHolder {
  address: string;
  tokenIds: string[];
}

export interface CanvasInfo {
  actionPoints: number;
  level: number;
  customized: boolean;
  delegate: string;
  delegateSetBy: string;
}

export interface CanvasDiff {
  added: { x: number; y: number }[];
  removed: { x: number; y: number }[];
  addedCount: number;
  removedCount: number;
  netChange: number;
}

export interface CanvasStatus {
  paused: boolean;
  maxBurnPercent: number;
  tierThresholds: number[];
  tierMinPercents: number[];
}

export interface BurnedTokenInfo {
  tokenId: string;
  txHash: string;
  blockNumber: string;
  timestamp: string;
  commitment?: BurnCommitment;
}

export interface BurnCommitment {
  commitId: string;
  owner: string;
  receiverTokenId: string;
  tokenCount: number;
  transferredActionPoints: string;
  pixelCounts?: number[];
  blockNumber: string;
  timestamp: string;
  txHash: string;
  revealed: boolean;
  totalActions: string;
  expired: boolean;
}

export interface NormieMatch {
  id: number;
  score: number;
  distance: number;
}

export interface TraitsIndexEntry {
  id: number;
  type: string;
  gender: string;
  age: string;
  hair: string;
  face: string;
  eyes: string;
  expression: string;
  accessory: string;
  pixelCount?: number;
  level?: number;
  customized?: boolean;
}
