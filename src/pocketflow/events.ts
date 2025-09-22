// Pocketflow event constants and basic typings
export const PF_RUNTIME_ENV_LOADED = 'pocketflow/runtime/envLoaded';
export const PF_MCARD_SELECTED = 'pocketflow/mcard/selected';
export const PF_MCARD_SELECTION_CHANGED = 'pocketflow/mcard/selectionChanged';

export interface MCardSelectedPayload {
  hash: string;
  title?: string;
  gTime?: string;
  contentType?: string;
}

export interface RuntimeEnvPayload {
  [key: string]: string | undefined;
}
