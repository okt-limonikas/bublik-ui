/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { useRef, useState } from 'react';
import { z } from 'zod';

import { ImportEventResponse, ImportRunsFormValues } from '@/shared/types';
import { useImportRunsMutation } from '@/services/bublik-api';

import {
	ImportRunForm,
	ImportRunFormHandle
} from './import-run-form.component';
import { ImportRunFormModal } from './import-run-form-modal.component';
import { RunImportResult } from './import-run-form-result-list.component';

type FormState = 'form' | 'result';

export const useImportTasks = () => {
	const [importRuns] = useImportRunsMutation();
	const [step, setStep] = useState<FormState>('form');
	const [celeryTasks, setCeleryTasks] = useState<ImportEventResponse[]>([]);
	const importFormRef = useRef<ImportRunFormHandle>(null);

	const onFormSubmit = async ({ runs }: ImportRunsFormValues) => {
		const form = importFormRef.current?.form;
		if (!form) return;

		try {
			const onlyUrls = runs.filter(
				(run) => z.string().url().safeParse(run.url).success
			);

			if (!onlyUrls.length) {
				form.setError('root', {
					message: 'You must enter at least one valid URL'
				});
				return;
			}

			const results = await importRuns(onlyUrls).unwrap();

			setStep('result');
			setCeleryTasks(results);
		} catch (e: unknown) {
			if (e instanceof Error) {
				form.setError('root', { message: String(e.message) });
				return;
			}

			form.setError('root', { message: 'Unknown error' });
		}
	};

	const onFormClose = () => {
		setStep('form');
		setCeleryTasks([]);
	};

	return { step, onFormClose, onFormSubmit, celeryTasks, importFormRef };
};

export const ImportRunFormContainer = () => {
	const { step, onFormClose, onFormSubmit, celeryTasks, importFormRef } =
		useImportTasks();

	return (
		<ImportRunFormModal onClose={onFormClose}>
			{step === 'form' && (
				<ImportRunForm onImportRunsSubmit={onFormSubmit} ref={importFormRef} />
			)}
			{step === 'result' && <RunImportResult results={celeryTasks} />}
		</ImportRunFormModal>
	);
};
