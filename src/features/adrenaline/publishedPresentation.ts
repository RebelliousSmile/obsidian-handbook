/**
 * What the compact card reads of a published presentation, as structural types
 * whose properties are optional. A presentation published by an older contract
 * lacks the newer properties and still satisfies them; a newer one satisfies
 * them too. The rendering therefore compiles against either, and a property
 * the installed contract does not publish simply reads as absent.
 */
export interface PublishedPlacement {
	column: number;
	row: number;
	rowSpan?: number;
	columnSpan?: number;
}

export interface PublishedDecoration {
	kind: string;
	length?: number;
	stressDefault?: number;
	triggerMarker?: boolean;
	current?: { path?: string; cards?: readonly string[]; position?: string };
}

export interface PublishedBlock {
	id: string;
	label: string;
	order: number;
	columns?: number;
	form?: string;
	placement?: PublishedPlacement;
	subtitlePaths?: readonly string[];
	rowLabels?: readonly string[];
	pointerRows?: readonly (readonly { path: string; label?: string }[])[];
	cards?: readonly string[];
	decoration?: PublishedDecoration;
	paths: readonly string[];
}

export interface PublishedSection {
	id: string;
	label: string;
	order: number;
	layout?: string;
	columns?: number;
	showTitle?: boolean;
	collapsible?: boolean;
	labelFrom?: string;
	cards?: readonly string[];
	joinedTo?: { section: string; title: string; card: string };
	fallbackCard?: string;
	blocks: readonly PublishedBlock[];
}

export interface PublishedCard {
	id: string;
	existsWhenAny?: readonly string[];
}

export interface PublishedCategories {
	path: string;
	fallbackLabel?: string;
	defaultVariant?: string;
	defaultIcon?: string;
	variants: Readonly<Record<string, string>>;
	icons: Readonly<Record<string, string>>;
}

export interface PublishedPresentation {
	appearance: { surface: string; values: { align: string } };
	categories?: PublishedCategories;
	cards?: readonly PublishedCard[];
	sections: readonly PublishedSection[];
}
