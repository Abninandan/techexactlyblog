import {createSlice} from '@reduxjs/toolkit'

const initialState = {
   user:{ 
    name: "",
    email: "",
    password: "",
   },
    isLoggedIn: false
}
export const infoSlice = createSlice({
    name: "info",
    initialState,   
    reducers: {
        setInfo: (state, action) => {
            state.user.name = action.payload.name
            state.user.email = action.payload.email
            state.user.password = action.payload.password
        },
        setLoggedIn: (state) => {
            state.isLoggedIn = true
        },
        setLoggedOut: (state) => {
            state.isLoggedIn = false
        }

    }
})
export const {setInfo, setLoggedIn, setLoggedOut} = infoSlice.actions
export default infoSlice.reducer
