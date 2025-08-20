import { pocketflow } from './bus';
import { initPocketflowReduxBridge } from './bridge-redux';
import { store } from '../store/store';

// Initialize the bridge once on client
initPocketflowReduxBridge(store);

// Optional: Dev log
if (typeof window !== 'undefined') {
  console.log('✅ Pocketflow bridge initialized');
  (window as any).__pf = { pocketflow };
}
