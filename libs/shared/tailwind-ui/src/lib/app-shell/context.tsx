/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2024-2026 OKTET LTD */
import { createContext, FC, ReactNode, useCallback, useContext } from 'react';

export interface SidebarContext {
	isSidebarOpen: boolean;
	isSidebarCollapsed: boolean;
	sidebarState: 'expanded' | 'collapsed';
	toggleSidebar: () => void;
	setSidebarOpen: (open: boolean) => void;
}

export const SidebarContext = createContext<SidebarContext | null>(null);
SidebarContext.displayName = 'SidebarContext';

export const useSidebar = () => {
	const context = useContext(SidebarContext);

	if (!context) {
		throw new Error('useSidebar must be used within a SidebarContextProvider');
	}

	return context;
};

export interface SidebarProviderProps {
	isSidebarOpen?: boolean;
	toggleSidebar?: () => void;
	setSidebarOpen?: (open: boolean) => void;
	children?: ReactNode;
}

export const SidebarProvider: FC<SidebarProviderProps> = ({
	isSidebarOpen = true,
	setSidebarOpen,
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	toggleSidebar = () => {},
	children
}) => {
	const handleSetSidebarOpen = useCallback(
		(open: boolean) => {
			setSidebarOpen?.(open);
		},
		[setSidebarOpen]
	);

	const handleToggleSidebar = useCallback(() => {
		if (setSidebarOpen) {
			setSidebarOpen(!isSidebarOpen);
			return;
		}

		toggleSidebar();
	}, [isSidebarOpen, setSidebarOpen, toggleSidebar]);

	return (
		<SidebarContext.Provider
			value={{
				isSidebarOpen,
				isSidebarCollapsed: !isSidebarOpen,
				sidebarState: isSidebarOpen ? 'expanded' : 'collapsed',
				toggleSidebar: handleToggleSidebar,
				setSidebarOpen: handleSetSidebarOpen
			}}
		>
			{children}
		</SidebarContext.Provider>
	);
};
