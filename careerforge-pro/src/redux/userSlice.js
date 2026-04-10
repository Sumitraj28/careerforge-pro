import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  userId: null,
  email: null,
  plan: 'free',
  resumeCount: 0,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action) => {
      return { ...state, ...action.payload };
    },
    setPlan: (state, action) => {
      state.plan = action.payload;
    },
    incrementResumeCount: (state) => {
      state.resumeCount += 1;
    },
    clearUser: () => {
      return initialState;
    },
  },
});

export const { setUser, setPlan, incrementResumeCount, clearUser } = userSlice.actions;
export default userSlice.reducer;
