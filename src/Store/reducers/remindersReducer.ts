import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type Priority = 'low' | 'medium' | 'high'

export interface Reminder {
	id: string
	title: string
	description: string | null
	due_date: string | null
	priority: Priority
	completed: boolean
	created_at: string
}

export interface RemindersState {
	items: Reminder[]
	loading: boolean
	error: string | null
}

const initialState: RemindersState = {
	items: [],
	loading: false,
	error: null,
}

const remindersSlice = createSlice({
	name: 'reminders',
	initialState,
	reducers: {
		addReminder: (state, action: PayloadAction<Reminder>) => {
			state.items.unshift(action.payload)
		},
		setLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload
		},
		setError: (state, action: PayloadAction<string | null>) => {
			state.error = action.payload
		},
	},
})

export const { addReminder, setLoading, setError } = remindersSlice.actions

export const remindersReducer = remindersSlice.reducer
