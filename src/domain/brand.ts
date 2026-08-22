declare const brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [brand]: B };

export function brandAs<T, B extends string>(value: T): Brand<T, B> {
	return value as Brand<T, B>;
}
