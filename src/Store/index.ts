import { API } from '@/Services/base'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import {
	persistReducer,
	persistStore,
	FLUSH,
	REHYDRATE,
	PAUSE,
	PERSIST,
	PURGE,
	REGISTER,
} from 'redux-persist'
import { homeReducers, themeReducers, remindersReducer, authReducer } from './reducers'

const reducers = combineReducers({
	api: API.reducer,
	theme: themeReducers,
	home: homeReducers,
	auth: authReducer,
	reminders: remindersReducer,
})

const persistConfig = {
	key: 'root',
	storage: AsyncStorage,
	whitelist: ['theme', 'auth'],
}

const persistedReducer = persistReducer(persistConfig, reducers)

const store = configureStore({
	reducer: persistedReducer,
	middleware: (getDefaultMiddleware) => {
		const middlewares = getDefaultMiddleware({
			serializableCheck: {
				ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
			},
		}).concat(API.middleware)

		// if (__DEV__ && !process.env.JEST_WORKER_ID) {
		//   const createDebugger = require("redux-flipper").default;
		//   middlewares.push(createDebugger());
		// }

		return middlewares
	},
})

const persistor = persistStore(store)

setupListeners(store.dispatch)

export { store, persistor }

export type RootState = ReturnType<typeof reducers>
export type AppDispatch = typeof store.dispatch
