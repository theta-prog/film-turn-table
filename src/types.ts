export type FilterType = 'film' | 'record' | 'exposure' | 'vintage' | 'street';
export type ShutterMode = 'manual' | 'auto';
export type Phase = 'setup' | 'playing' | 'result';

/** 画面の雰囲気（背景）と文字の出方（アニメーション）を組み合わせた設定 */
export interface LookSettings {
  atmosphere: FilterType;  // 画面の雰囲気・背景スタイル
  textStyle: FilterType;   // 文字の出方・アニメーション
}

/** プリセット：atmosphere と textStyle が同じ値のショートカット */
export function lookPreset(id: FilterType): LookSettings {
  return { atmosphere: id, textStyle: id };
}

export type PresetId = FilterType | 'custom';

interface CaptureBase {
  phrase: string;
  timestamp: number;
  look: LookSettings;
  songPosition?: number; // ms position in song at time of capture
}

export interface Photo extends CaptureBase {
  kind: 'photo';
  dataUrl: string;
}

export interface VideoClip extends CaptureBase {
  kind: 'video';
  dataUrl: string;
  posterUrl: string;
  durationMs: number;
  mimeType: string;
}

export type CaptureItem = Photo | VideoClip;

export interface SetupConfig {
  token: string;
  songUrl: string;
}
