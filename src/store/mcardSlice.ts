import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface MCardSelectionState {
  hash: string | null;
  title: string | null;
  gTime: string | null;
  contentType: string | null;
}

const initialState: MCardSelectionState = {
  hash: null,
  title: null,
  gTime: null,
  contentType: null,
};

export const mcardSlice = createSlice({
  name: 'mcardSelection',
  initialState,
  reducers: {
    setSelectedMCard: (state, action: PayloadAction<{ hash: string; title: string; gTime?: string; contentType?: string }>) => {
      state.hash = action.payload.hash;
      state.title = action.payload.title;
      state.gTime = action.payload.gTime || null;
      state.contentType = action.payload.contentType || null;
    },
    clearSelectedMCard: (state) => {
      state.hash = null;
      state.title = null;
      state.gTime = null;
      state.contentType = null;
    },
  },
});

export const { setSelectedMCard, clearSelectedMCard } = mcardSlice.actions;

export default mcardSlice.reducer;
