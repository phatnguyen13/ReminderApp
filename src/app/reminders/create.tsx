import React, { useState } from 'react'
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	StyleSheet,
	ScrollView,
	Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { i18n, LocalizationKey } from '@/Localization'
import { Colors, MetricsSizes, FontSize } from '@/Theme/Variables'
import { addReminder, setLoading, setError } from '@/Store/reducers/remindersReducer'
import { createReminder, Priority, ValidationError } from '@/Services/reminders'
import type { AppDispatch, RootState } from '@/Store'

const PRIORITIES: Priority[] = ['low', 'medium', 'high']

export default function CreateReminderScreen() {
	const router = useRouter()
	const dispatch = useDispatch<AppDispatch>()
	const loading = useSelector((state: RootState) => state.reminders.loading)

	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [dueDate, setDueDate] = useState('')
	const [priority, setPriority] = useState<Priority>('medium')
	const [inlineError, setInlineError] = useState<string | null>(null)

	const handleSubmit = async () => {
		setInlineError(null)

		if (!title.trim()) {
			setInlineError(i18n.t(LocalizationKey.CREATE_REMINDER_ERROR_REQUIRED))
			return
		}

		if (dueDate.trim() && isNaN(Date.parse(dueDate.trim()))) {
			setInlineError(i18n.t(LocalizationKey.CREATE_REMINDER_DUE_DATE_INVALID))
			return
		}

		dispatch(setLoading(true))
		dispatch(setError(null))

		try {
			const result = await dispatch(
				createReminder({
					title: title.trim(),
					description: description.trim() || undefined,
					due_date: dueDate.trim() || undefined,
					priority,
				}),
			)

			if (result.success) {
				dispatch(addReminder(result.data))
				dispatch(setLoading(false))
				Alert.alert(i18n.t(LocalizationKey.CREATE_REMINDER_SUCCESS))
				router.back()
			} else if (result.validationErrors === null) {
				// 401 — session expired, clearAuth already dispatched by service
				dispatch(setLoading(false))
				router.replace('/login')
			} else {
				const errorMessage =
					result.validationErrors.length > 0
						? result.validationErrors.map((e: ValidationError) => e.msg).join('\n')
						: i18n.t(LocalizationKey.CREATE_REMINDER_ERROR_REQUIRED)
				dispatch(setError(errorMessage))
				dispatch(setLoading(false))
				setInlineError(errorMessage)
			}
		} catch {
			const fallback = i18n.t(LocalizationKey.CREATE_REMINDER_ERROR_REQUIRED)
			dispatch(setError(fallback))
			dispatch(setLoading(false))
			setInlineError(fallback)
		}
	}

	return (
		<ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
			<Text style={styles.fieldLabel}>{i18n.t(LocalizationKey.CREATE_REMINDER_TITLE)}</Text>
			<TextInput
				style={styles.input}
				value={title}
				onChangeText={setTitle}
				placeholder={i18n.t(LocalizationKey.CREATE_REMINDER_TITLE)}
				placeholderTextColor={Colors.TEXT + '66'}
				testID="input-title"
			/>

			<Text style={styles.fieldLabel}>{i18n.t(LocalizationKey.CREATE_REMINDER_DESCRIPTION)}</Text>
			<TextInput
				style={[styles.input, styles.multiline]}
				value={description}
				onChangeText={setDescription}
				placeholder={i18n.t(LocalizationKey.CREATE_REMINDER_DESCRIPTION)}
				placeholderTextColor={Colors.TEXT + '66'}
				multiline
				numberOfLines={4}
				textAlignVertical="top"
				testID="input-description"
			/>

			<Text style={styles.fieldLabel}>{i18n.t(LocalizationKey.CREATE_REMINDER_DUE_DATE)}</Text>
			<TextInput
				style={styles.input}
				value={dueDate}
				onChangeText={setDueDate}
				placeholder="YYYY-MM-DD HH:MM"
				placeholderTextColor={Colors.TEXT + '66'}
				testID="input-due-date"
			/>

			<Text style={styles.fieldLabel}>{i18n.t(LocalizationKey.CREATE_REMINDER_PRIORITY)}</Text>
			<View style={styles.priorityRow}>
				{PRIORITIES.map((p) => (
					<TouchableOpacity
						key={p}
						style={[styles.priorityButton, priority === p && styles.priorityButtonActive]}
						onPress={() => setPriority(p)}
						testID={`priority-${p}`}
					>
						<Text style={[styles.priorityText, priority === p && styles.priorityTextActive]}>
							{p.charAt(0).toUpperCase() + p.slice(1)}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{inlineError ? <Text style={styles.errorText}>{inlineError}</Text> : null}

			<TouchableOpacity
				style={[styles.submitButton, loading && styles.submitButtonDisabled]}
				onPress={handleSubmit}
				disabled={loading}
				testID="btn-submit"
			>
				{loading ? (
					<ActivityIndicator color={Colors.WHITE} />
				) : (
					<Text style={styles.submitText}>{i18n.t(LocalizationKey.CREATE_REMINDER_SUBMIT)}</Text>
				)}
			</TouchableOpacity>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		padding: MetricsSizes.REGULAR,
		backgroundColor: Colors.WHITE,
		flexGrow: 1,
	},
	fieldLabel: {
		fontSize: FontSize.SMALL,
		color: Colors.TEXT,
		marginBottom: MetricsSizes.TINY,
		marginTop: MetricsSizes.SMALL,
		fontWeight: '600',
	},
	input: {
		backgroundColor: Colors.INPUT_BACKGROUND,
		borderWidth: 1,
		borderColor: '#ced4da',
		borderRadius: 6,
		paddingHorizontal: MetricsSizes.SMALL,
		paddingVertical: MetricsSizes.TINY + 2,
		fontSize: FontSize.SMALL,
		color: Colors.TEXT,
	},
	multiline: {
		minHeight: 90,
	},
	priorityRow: {
		flexDirection: 'row',
		gap: MetricsSizes.SMALL,
	},
	priorityButton: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#ced4da',
		borderRadius: 6,
		paddingVertical: MetricsSizes.TINY + 2,
		alignItems: 'center',
	},
	priorityButtonActive: {
		borderColor: Colors.PRIMARY,
		backgroundColor: Colors.PRIMARY,
	},
	priorityText: {
		fontSize: FontSize.SMALL,
		color: Colors.TEXT,
	},
	priorityTextActive: {
		color: Colors.WHITE,
		fontWeight: '600',
	},
	errorText: {
		color: Colors.ERROR,
		fontSize: FontSize.SMALL - 2,
		marginTop: MetricsSizes.SMALL,
	},
	submitButton: {
		backgroundColor: Colors.PRIMARY,
		borderRadius: 8,
		paddingVertical: MetricsSizes.SMALL + 2,
		alignItems: 'center',
		marginTop: MetricsSizes.LARGE,
	},
	submitButtonDisabled: {
		opacity: 0.6,
	},
	submitText: {
		color: Colors.WHITE,
		fontSize: FontSize.SMALL,
		fontWeight: '700',
	},
})
