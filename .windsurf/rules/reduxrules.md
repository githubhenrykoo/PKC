---
trigger: always_on
---

# Redux State Management Rules for PKC

## Core Principle

**All application state MUST be managed through Redux. No exceptions.**

This document establishes strict guidelines for Redux usage in the PKC project to ensure centralized, predictable, and maintainable state management.

## Centralized Architecture Rule

### Redux File Organization

**All Redux-related files MUST be located within the `src/store` directory and its subdirectories ONLY.**

```
src/store/
├── index.ts                    # Store configuration and exports
├── types/                      # TypeScript type definitions
│   ├── auth.ts                # Auth-related types
│   ├── ui.ts                  # UI state types
│   ├── data.ts                # Data state types
│   └── index.ts               # Re-export all types
├── slices/                     # Redux slices
│   ├── auth-slice.ts          # Authentication slice
│   ├── ui-slice.ts            # UI state slice
│   ├── data-slice.ts          # Data management slice
│   └── index.ts               # Re-export all slices
├── selectors/                  # Memoized selectors
│   ├── auth-selectors.ts      # Auth state selectors
│   ├── ui-selectors.ts        # UI state selectors
│   ├── data-selectors.ts      # Data state selectors
│   └── index.ts               # Re-export all selectors
├── middleware/                 # Custom middleware
│   ├── auth-middleware.ts     # Authentication middleware
│   ├── api-middleware.ts      # API interaction middleware
│   └── index.ts               # Re-export all middleware
├── thunks/                     # Async thunks (if complex)
│   ├── auth-thunks.ts         # Authentication async actions
│   ├── data-thunks.ts         # Data fetching async actions
│   └── index.ts               # Re-export all thunks
└── utils/                      # Redux utility functions
    ├── storage.ts             # Persistence utilities
    ├── transforms.ts          # State transforms
    └── index.ts               # Re-export all utils
```

## Mandatory Rules

### 1. **No State Outside Redux**
- ❌ **FORBIDDEN**: `useState`, `useReducer`, or any local component state for application data
- ❌ **FORBIDDEN**: Context API for application state
- ❌ **FORBIDDEN**: External state management libraries (Zustand, Jotai, etc.)
- ✅ **ALLOWED**: Local state only for pure UI interactions (form inputs, temporary animations)

### 2. **Single Source of Truth**
- All application data must flow through Redux store
- No duplicate state across components
- No state synchronization between different state systems

### 3. **File Location Enforcement**
```typescript
// ❌ WRONG - Redux files outside src/store
src/components/auth/auth-slice.ts
src/utils/redux-helpers.ts
src/pages/dashboard/dashboard-state.ts

// ✅ CORRECT - All Redux files in src/store
src/store/slices/auth-slice.ts
src/store/utils/helpers.ts
src/store/selectors/dashboard-selectors.ts
```

### 4. **Import Restrictions**
```typescript
// ❌ WRONG - Importing from scattered locations
import { authSlice } from '../../../components/auth/slice';
import { userSelectors } from '../../utils/selectors';

// ✅ CORRECT - Centralized imports
import { authSlice } from '@/store/slices';
import { userSelectors } from '@/store/selectors';
```

## State Categories

### 1. Authentication State (`auth` slice)
**Location**: `src/store/slices/auth-slice.ts`
- User information
- Authentication tokens
- Session management
- Permissions and roles
- Login/logout status

### 2. UI State (`ui` slice)
**Location**: `src/store/slices/ui-slice.ts`
- Modal states
- Loading indicators
- Error messages
- Theme settings
- Sidebar/navigation state
- Form validation states

### 3. Data State (`data` slice)
**Location**: `src/store/slices/data-slice.ts`
- MCard data and cache
- Search results
- User preferences
- Application settings
- API response cache
- Pagination states

## Implementation Requirements

### 1. **TypeScript Enforcement**
```typescript
// All Redux files MUST use TypeScript
// Types MUST be defined in src/store/types/

interface RootState {
  auth: AuthState;
  ui: UIState;
  data: DataState;
}

// Export from centralized location
export type { RootState } from '@/store/types';
```

### 2. **Selector Usage**
```typescript
// ❌ WRONG - Direct state access
const user = useSelector(state => state.auth.user);

// ✅ CORRECT - Use predefined selectors
const user = useSelector(selectUser);
```

### 3. **Action Creators**
```typescript
// All actions MUST be created through RTK slices
// Located in src/store/slices/

export const { login, logout, updateUser } = authSlice.actions;
```

### 4. **Async Operations**
```typescript
// Use createAsyncThunk for all async operations
// Located in src/store/slices/ (simple) or src/store/thunks/ (complex)

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: LoginCredentials) => {
    // Implementation
  }
);
```

## Component Integration Rules

### 1. **Hook Usage**
```typescript
// ✅ CORRECT - Proper Redux hooks usage
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, selectIsLoading } from '@/store/selectors';
import { loginUser } from '@/store/slices';

function LoginComponent() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isLoading = useSelector(selectIsLoading);
  
  const handleLogin = () => {
    dispatch(loginUser(credentials));
  };
}
```

### 2. **No State Duplication**
```typescript
// ❌ WRONG - Duplicating Redux state in local state
const [user, setUser] = useState(null);
const reduxUser = useSelector(selectUser);

// ✅ CORRECT - Single source of truth
const user = useSelector(selectUser);
```

## Persistence Rules

### 1. **Redux Persist Configuration**
**Location**: `src/store/index.ts`
```typescript
// Only persist essential state
const persistConfig = {
  key: 'pkc-root',
  storage,
  whitelist: ['auth'], // Only auth state persisted
  blacklist: ['ui'],   // UI state never persisted
};
```

### 2. **Security Considerations**
```typescript
// ❌ NEVER persist sensitive data
tokens: AuthTokens; // Don't persist raw tokens

// ✅ CORRECT - Transform sensitive data
const persistTransform = createTransform(
  (inboundState: AuthState) => ({
    ...inboundState,
    tokens: null, // Remove tokens from persistence
  }),
  (outboundState: AuthState) => outboundState
);
```

## Performance Rules

### 1. **Selector Memoization**
```typescript
// ✅ All selectors MUST be memoized
import { createSelector } from '@reduxjs/toolkit';

export const selectUserDisplayName = createSelector(
  [selectUser],
  (user) => user ? `${user.firstName} ${user.lastName}` : null
);
```

### 2. **State Normalization**
```typescript
// ✅ Normalize complex state structures
interface DataState {
  mcards: {
    byId: Record<string, MCard>;
    allIds: string[];
  };
  // Not: mcards: MCard[]; // ❌ Denormalized
}
```

## Development Rules

### 1. **Redux DevTools**
```typescript
// MUST be enabled in development
export const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production',
});
```

### 2. **Action Naming Convention**
```typescript
// Use consistent action naming
'auth/loginUser/pending'
'auth/loginUser/fulfilled' 
'auth/loginUser/rejected'

// NOT: 'LOGIN_START', 'userLogin', etc.
```

## Testing Rules

### 1. **Store Testing**
```typescript
// Test files co-located with Redux files
src/store/slices/__tests__/auth-slice.test.ts
src/store/selectors/__tests__/auth-selectors.test.ts
```

### 2. **Mock Store**
```typescript
// Use redux-mock-store for component testing
import configureStore from 'redux-mock-store';

const mockStore = configureStore([]);
```

## Migration Rules

### 1. **Legacy State Migration**
- All existing local state must be migrated to Redux
- No gradual adoption - full commitment required
- Document all state migrations

### 2. **External Libraries**
- Remove any existing state management libraries
- Migrate Context providers to Redux
- Update all components to use Redux hooks

## Enforcement

### 1. **Code Review Requirements**
- All PRs with state changes must be reviewed for Redux compliance
- No exceptions for "quick fixes" or "temporary solutions"
- Document any deviations (there should be none)

### 2. **Linting Rules**
```json
// ESLint rules to enforce Redux usage
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["react"],
            "importNames": ["useState", "useReducer"],
            "message": "Use Redux for all state management"
          }
        ]
      }
    ]
  }
}
```

## Exception Handling

### **No Exceptions Allowed**
- This rule has NO exceptions
- All state must go through Redux
- Any deviation requires architecture review and documentation update

## Compliance Checklist

Before any component/feature implementation:

- [ ] Is this state application-wide? → Redux required
- [ ] Does this state need persistence? → Redux required  
- [ ] Will other components need this state? → Redux required
- [ ] Is this pure UI interaction (hover, focus)? → Local state allowed
- [ ] Are Redux store files in `src/store/`? → Required
- [ ] Are selectors memoized? → Required
- [ ] Are TypeScript types defined? → Required

---

**Last Updated**: 2025-07-30
**Version**: 1.0
**Status**: Mandatory Compliance Required
