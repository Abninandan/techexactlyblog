import {configureStore} from '@reduxjs/toolkit';
import infoReducer from './features/infoslice';
export const store = configureStore({
    reducer: {
        info: infoReducer
    }
})