/* SPDX-License-Identifier: Apache-2.0 */
/* SPDX-FileCopyrightText: 2021-2023 OKTET Labs Ltd. */
export type AsProp<C extends React.ElementType> = {
	as?: C;
};

export type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P);

export type PolymorphicComponentProp<
	C extends React.ElementType,
	Props = Record<string, unknown>
> = React.PropsWithChildren<Props & AsProp<C>> &
	Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>;

export type PolymorphicComponentPropWithRef<
	C extends React.ElementType,
	Props = Record<string, unknown>
> = PolymorphicComponentProp<C, Props> & { ref?: PolymorphicRef<C> };

export type PolymorphicRef<C extends React.ElementType> =
	React.ComponentPropsWithRef<C>['ref'];
