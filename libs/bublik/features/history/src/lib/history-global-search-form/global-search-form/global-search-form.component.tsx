/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
import { FormProvider } from 'react-hook-form';

import { ButtonTw, Icon, cn } from '@/shared/tailwind-ui';

import {
	HistoryGlobalSearchFormValues,
	defaultValues
} from './global-search-form.types';
import {
	useCtrlEnterSubmit,
	useHistoryGlobalSearchForm
} from './global-search-form.hooks';
import { FormHeader } from './components';
import {
	TestSection,
	RunSection,
	ResultSection,
	VerdictSection
} from './sections';
import { useIsScrollbarVisible } from '@/shared/hooks';

export interface GlobalSearchFormProps {
	initialValues?: HistoryGlobalSearchFormValues;
	onSubmit: (form: HistoryGlobalSearchFormValues) => void;
	onCloseButtonClick: () => void;
	onFormChange: (form: HistoryGlobalSearchFormValues) => void;
}

export const GlobalSearchForm = (props: GlobalSearchFormProps) => {
	const {
		onSubmit,
		initialValues = defaultValues,
		onCloseButtonClick,
		onFormChange
	} = props;

	const form = useHistoryGlobalSearchForm({ initialValues, onFormChange });

	useCtrlEnterSubmit({ methods: form.methods, onSubmit });

	const [scrollableRef, isVisible] = useIsScrollbarVisible<HTMLDivElement>();

	return (
		<div
			className="h-full w-screen max-w-[48rem] overflow-auto bg-white styled-scrollbar"
			ref={scrollableRef}
		>
			<FormProvider {...form.methods}>
				<form
					onSubmit={form.methods.handleSubmit(onSubmit)}
					onKeyDown={form.handleKeyDown}
					className="flex h-full flex-col gap-4 px-4 pt-4 pb-2 md:px-6"
				>
					<MainFormHeader onCloseButtonClick={onCloseButtonClick} />
					<TestSection onResetTestSectionResetClick={form.resetTestSection} />
					<RunSection onResetRunSectionClick={form.resetRunSection} />
					<ResultSection onResultSectionClick={form.resetVerdictSection} />
					<VerdictSection />
					<StickySubmit
						onResetClick={form.resetForm}
						isScrollable={isVisible}
					/>
				</form>
			</FormProvider>
		</div>
	);
};

type MainFormHeaderProps = {
	onCloseButtonClick: () => void;
};

const MainFormHeader = (props: MainFormHeaderProps) => {
	return (
		<div className="mt-2 mb-1">
			<FormHeader
				name="Global Search"
				description="Combine test, run, result, and verdict filters to narrow down history."
			>
				<button
					type="button"
					className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/60 text-text-menu transition-colors hover:bg-primary-wash hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
					aria-label="Close"
					onClick={props.onCloseButtonClick}
				>
					<Icon name="Cross" size={12} />
				</button>
			</FormHeader>
		</div>
	);
};

type StickySubmitProps = {
	onResetClick: () => void;
	isScrollable: boolean;
};

const StickySubmit = (props: StickySubmitProps) => {
	return (
		<div
			className={cn(
				'sticky bottom-0 z-20 mt-auto w-full border-t border-border-primary bg-white/95 py-4 backdrop-blur-sm supports-[backdrop-filter]:bg-white/85',
				props.isScrollable && 'shadow-sticky'
			)}
		>
			<div className="flex flex-col gap-3 sm:flex-row">
				<ButtonTw
					size="md"
					rounded="lg"
					variant="primary"
					type="submit"
					className="justify-center w-full"
				>
					Apply Filters
				</ButtonTw>
				<ButtonTw
					type="button"
					variant="outline"
					size="md"
					className="justify-center w-full"
					onClick={props.onResetClick}
				>
					Reset
				</ButtonTw>
			</div>
			<div className="mt-2 text-[0.6875rem] leading-4 text-text-menu">
				Tip: press Ctrl + Enter to submit
			</div>
		</div>
	);
};
