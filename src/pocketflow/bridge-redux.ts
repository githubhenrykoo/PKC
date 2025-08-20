import type { Unsubscribe } from './bus';
import { pocketflow } from './bus';
import { PF_MCARD_SELECTED, PF_MCARD_SELECTION_CHANGED, PF_RUNTIME_ENV_LOADED, type MCardSelectedPayload, type RuntimeEnvPayload } from './events';
import { type Store } from '@reduxjs/toolkit';
import { setSelectedMCard } from '../store/mcardSlice';

export function initPocketflowReduxBridge(store: Store) {
  // Pocketflow → Redux: selection intent
  const unsubPFSelected: Unsubscribe = pocketflow.subscribe<MCardSelectedPayload>(PF_MCARD_SELECTED, (payload) => {
    if (!payload?.hash) return;
    store.dispatch(setSelectedMCard({
      hash: payload.hash,
      title: payload.title || 'MCard Content',
      gTime: payload.gTime,
      contentType: payload.contentType,
    }));
  });

  // Redux → Pocketflow: selection changed state
  let lastHash: string | null = null;
  const unsubRedux = store.subscribe(() => {
    const state: any = store.getState();
    const sel = state?.mcardSelection;
    if (sel?.hash && sel.hash !== lastHash) {
      lastHash = sel.hash;
      pocketflow.publish(PF_MCARD_SELECTION_CHANGED, sel);
    }
  });

  // Runtime env propagation: listen for DOM event and publish to Pocketflow
  const envHandler = () => {
    try {
      const env = (window as any).RUNTIME_ENV || {};
      pocketflow.publish<RuntimeEnvPayload>(PF_RUNTIME_ENV_LOADED, env);
    } catch {}
  };
  window.addEventListener('runtime-env-loaded' as any, envHandler);

  return () => {
    unsubPFSelected?.();
    unsubRedux?.();
    window.removeEventListener('runtime-env-loaded' as any, envHandler);
  };
}
