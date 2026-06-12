import { API_BASE } from "../constants";
import type {
  BurnedTokenInfo,
  CanvasDiff,
  CanvasInfo,
  CanvasStatus,
  NormieHolder,
  NormieMetadata,
  NormieOwner,
  NormieTraits,
} from "./types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${url}`);
  }
  return res.text();
}

export function normieImageUrl(id: number): string {
  return `${API_BASE}/normie/${id}/image.png`;
}

export function normieOriginalImageUrl(id: number): string {
  return `${API_BASE}/normie/${id}/original/image.png`;
}

export function burnedNormieImageUrl(id: number): string {
  return `${API_BASE}/history/burned/${id}/image.svg`;
}

export function openSeaUrl(id: number): string {
  return `https://opensea.io/assets/ethereum/${"0x9Eb6E2025B64f340691e424b7fe7022fFDE12438"}/${id}`;
}

export function etherscanAddressUrl(address: string): string {
  return `https://etherscan.io/address/${address}`;
}

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function normalizeEthAddress(address: string): string {
  return address.trim();
}

export function isEthAddress(address: string): boolean {
  return ETH_ADDRESS_RE.test(normalizeEthAddress(address));
}

export async function getHolderTokens(address: string): Promise<number[]> {
  const clean = normalizeEthAddress(address);
  if (!isEthAddress(clean)) {
    throw new Error("Invalid Ethereum address");
  }
  const data = await fetchJson<NormieHolder>(`${API_BASE}/holders/${clean}`);
  return data.tokenIds
    .map((id) => parseInt(id, 10))
    .filter((id) => !Number.isNaN(id) && id >= 0 && id <= 9999);
}

export async function getTraits(id: number): Promise<NormieTraits> {
  return fetchJson(`${API_BASE}/normie/${id}/traits`);
}

export async function getMetadata(id: number): Promise<NormieMetadata> {
  return fetchJson(`${API_BASE}/normie/${id}/metadata`);
}

export async function getPixels(id: number): Promise<string> {
  return fetchText(`${API_BASE}/normie/${id}/pixels`);
}

export async function getOriginalPixels(id: number): Promise<string> {
  return fetchText(`${API_BASE}/normie/${id}/original/pixels`);
}

export async function getCanvasPixels(id: number): Promise<string> {
  return fetchText(`${API_BASE}/normie/${id}/canvas/pixels`);
}

export async function getCanvasDiff(id: number): Promise<CanvasDiff> {
  return fetchJson(`${API_BASE}/normie/${id}/canvas/diff`);
}

export async function getCanvasStatus(): Promise<CanvasStatus> {
  return fetchJson(`${API_BASE}/canvas/status`);
}

export async function getBurnedInfo(id: number): Promise<BurnedTokenInfo | null> {
  const res = await fetch(`${API_BASE}/history/burned/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status}: burned`);
  return res.json() as Promise<BurnedTokenInfo>;
}

/** Owner lookup that does not throw on indexer outages (502/503). */
export async function tryGetOwner(id: number): Promise<NormieOwner | null | "unknown"> {
  const res = await fetch(`${API_BASE}/normie/${id}/owner`);
  if (res.status === 404) return null;
  if (res.ok) return res.json() as Promise<NormieOwner>;
  if (res.status === 502 || res.status === 503) return "unknown";
  throw new Error(`API ${res.status}: owner`);
}

export function burnedNormiePngUrl(id: number): string {
  return `${API_BASE}/history/burned/${id}/image.png`;
}

export async function getOwner(id: number): Promise<NormieOwner | null> {
  const res = await fetch(`${API_BASE}/normie/${id}/owner`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status}: owner`);
  return res.json() as Promise<NormieOwner>;
}

export async function getCanvasInfo(id: number): Promise<CanvasInfo> {
  return fetchJson(`${API_BASE}/normie/${id}/canvas/info`);
}

export function getTraitValue(
  traits: NormieTraits | NormieMetadata,
  traitType: string,
): string | undefined {
  return traits.attributes.find((a) => a.trait_type === traitType)?.value;
}
