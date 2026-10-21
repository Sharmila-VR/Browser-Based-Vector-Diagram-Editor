import { configureStore } from '@reduxjs/toolkit';
import editorReducer from '../features/editor/editorSlice.js';

export const store = configureStore({
  reducer: {
    editor: editorReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
