import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'customer' | 'owner' | 'staff' | 'admin';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
}

const stored = localStorage.getItem('auth');
const initialState: AuthState = stored
  ? JSON.parse(stored)
  : { user: null, accessToken: null, refreshToken: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ user: AuthUser; accessToken: string; refreshToken: string }>,
    ) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      localStorage.setItem('auth', JSON.stringify(state));
    },
    setTokens(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      localStorage.setItem('auth', JSON.stringify(state));
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      localStorage.removeItem('auth');
    },
  },
});

export const { setCredentials, setTokens, logout } = authSlice.actions;
export default authSlice.reducer;
