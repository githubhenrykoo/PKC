import { Provider } from 'react-redux';
import { store } from '../../store';
import { AppInitializer } from './app-initializer';

interface ReduxProviderProps {
  children: React.ReactNode;
}

/**
 * ReduxProvider - Wraps the app with Redux store and initializes data
 * This component provides the Redux store to all child components
 * and triggers MCard data fetching on app startup
 */
export function ReduxProvider({ children }: ReduxProviderProps) {
  return (
    <Provider store={store}>
      <AppInitializer>
        {children}
      </AppInitializer>
    </Provider>
  );
}

// Make Redux store available globally for non-React components
if (typeof window !== 'undefined') {
  (window as any).__REDUX_STORE__ = store;
}
