import { Config } from '@/Config'
import { clearAuth } from '@/Store/reducers/authReducer'
import { Reminder } from '@/Store/reducers/remindersReducer'
import { AppDispatch, RootState } from '@/Store'

export type Priority = 'low' | 'medium' | 'high'

export interface CreateReminderPayload {
	title: string
	description?: string
	due_date?: string
	priority?: Priority
}

export interface CreateReminderSuccess {
	status: 'ok'
	message: string
	data: Reminder
}

export interface ValidationError {
	loc: (string | number)[]
	msg: string
	type: string
}

export interface CreateReminderValidationError {
	detail: ValidationError[]
}

export type CreateReminderResult =
	| { success: true; data: Reminder }
	| { success: false; validationErrors: ValidationError[] }
	| { success: false; validationErrors: null }

export const createReminder =
	(payload: CreateReminderPayload) =>
	async (dispatch: AppDispatch, getState: () => RootState): Promise<CreateReminderResult> => {
		const token = getState().auth.accessToken

		const response = await fetch(`${Config.API_URL}api/v1/reminders`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify(payload),
		})

		if (response.status === 401) {
			dispatch(clearAuth())
			return { success: false, validationErrors: null }
		}

		if (response.status === 422) {
			const body: CreateReminderValidationError = await response.json()
			return { success: false, validationErrors: body.detail }
		}

		if (response.status === 201) {
			const body: CreateReminderSuccess = await response.json()
			return { success: true, data: body.data }
		}

		return { success: false, validationErrors: null }
	}
