import type React from 'react';

import { ReactNode, useState } from 'react';
import { ArrowLeft, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

import mandys from '@/data/mandys.json';

const dressingsByName = mandys.dressings.reduce((acc, dressing) => {
	acc[dressing.name] = dressing;
	return acc;
}, {} as Record<string, (typeof mandys.dressings)[0]>);

const dressingsByComponentName = mandys.dressings.reduce((acc, dressing) => {
	if (dressing.components) {
		dressing.components.forEach(component => {
			if (!acc[component]) {
				acc[component] = [];
			}
			acc[component].push(dressing);
		});
	}
	return acc;
}, {} as Record<string, (typeof mandys.dressings)[0][]>);

const saladsByDressingName = mandys.salads.reduce((acc, salad) => {
	if (!acc[salad.dressing]) acc[salad.dressing] = [];
	acc[salad.dressing].push(salad);
	return acc;
}, {} as Record<string, Array<(typeof mandys.salads)[0]>>);

const bowlsByDressingName = mandys.bowls.reduce((acc, bowl) => {
	if (!acc[bowl.dressing]) acc[bowl.dressing] = [];
	acc[bowl.dressing].push(bowl);
	return acc;
}, {} as Record<string, Array<(typeof mandys.bowls)[0]>>);

type WithAdditionalDressings<T> = T & { additionalDressings?: { name: string; components: string[] } };
type DressingMapEntry = {
	salads: Array<WithAdditionalDressings<(typeof mandys.salads)[0]>>;
	bowls: Array<WithAdditionalDressings<(typeof mandys.bowls)[0]>>;
	dressings: WithAdditionalDressings<typeof mandys.dressings>;
};
type DressingMap = Record<string, DressingMapEntry>;
const dressingMap = mandys.dressings.reduce((acc, dressing) => {
	const result: DressingMapEntry = {
		salads: saladsByDressingName[dressing.name] ?? [],
		bowls: bowlsByDressingName[dressing.name] ?? [],
		dressings: dressingsByComponentName[dressing.name] ?? [],
	};

	// Add salads and bowls that use any dressing that contains this dressing as a component.
	result.dressings.forEach(superDressing => {
		const saladsUsingComponent = saladsByDressingName[superDressing.name] ?? [];
		const bowlsUsingComponent = bowlsByDressingName[superDressing.name] ?? [];

		result.salads.push(
			...saladsUsingComponent.map(salad => ({
				...salad,
				additionalDressings: {
					name: superDressing.name,
					components:
						superDressing.components?.filter(
							name =>
								name !== dressing.name &&
								!dressing.components?.some(componentName => name === componentName)
						) ?? [],
				},
			}))
		);
		result.bowls.push(
			...bowlsUsingComponent.map(bowl => ({
				...bowl,
				additionalDressings: {
					name: superDressing.name,
					components:
						superDressing.components?.filter(
							name =>
								name !== dressing.name &&
								!dressing.components?.some(componentName => name === componentName)
						) ?? [],
				},
			}))
		);
	});

	acc[dressing.name] = result;
	return acc;
}, {} as DressingMap);

const [usedDressings, unusedDressings] = mandys.dressings.reduce(
	(acc, dressing) => {
		const isUsedInSalads = saladsByDressingName[dressing.name]?.length > 0;
		const isUsedInBowls = bowlsByDressingName[dressing.name]?.length > 0;
		const isUsedAsComponent = dressingsByComponentName[dressing.name]?.length > 0;
		const isUsed = isUsedInSalads || isUsedInBowls || isUsedAsComponent;
		acc[isUsed ? 0 : 1].push(dressing);
		return acc;
	},
	[[], []] as [typeof mandys.dressings, typeof mandys.dressings]
);

// TODO: Why are there unused dressings?
if (unusedDressings.length > 0) {
	console.warn('Unused dressings:', unusedDressings.map(d => d.name).join(', '));
}

const dressingOptions = usedDressings.map(dressing => ({
	value: dressing.name,
	label: `${dressing.name} Dressing`,
}));

function CategoryTitle({ children }: { children: ReactNode }) {
	return <h2 className="mt-4 -mb-2 text-xl underline">{children}</h2>;
}

function RecipeTitle({ item }: { item: { name: string; page?: number } }) {
	return (
		<h3 className="mt-3">
			<span>{item.name}</span>
			{typeof item.page === 'number' ? ` (page ${item.page})` : ''}
		</h3>
	);
}

function DressingPage({ dressing, onBack }: { dressing: (typeof mandys.dressings)[0]; onBack: () => void }) {
	const { salads = [], bowls = [], dressings = [] } = dressingMap[dressing.name] || {};

	return (
		<div className="relative flex flex-col items-center justify-center min-h-screen p-4">
			<Button variant="ghost" size="icon" className="absolute top-4 left-4" onClick={onBack}>
				<ArrowLeft className="w-8 h-8" />
				<span className="sr-only">Back</span>
			</Button>
			<div>
				<h1 className="text-3xl">{dressing.name} Dressing</h1>
				{!!salads.length && (
					<>
						<CategoryTitle>Salads</CategoryTitle>
						{salads.map(salad => {
							const parentDressing = dressingsByName[salad.additionalDressings?.name ?? ''];
							const additionalDressings = salad.additionalDressings?.components;
							return (
								<>
									<RecipeTitle item={salad} />
									{salad.additionalDressings && (
										<p className="italic">
											Requires additional dressings
											{additionalDressings?.length ? ` (${additionalDressings.join(', ')})` : ''}.
											See {parentDressing.name}, page {parentDressing.page}.
										</p>
									)}
								</>
							);
						})}
					</>
				)}
				{!!bowls.length && (
					<>
						<CategoryTitle>Bowls</CategoryTitle>
						{bowls.map(bowl => {
							const parentDressing = dressingsByName[bowl.additionalDressings?.name ?? ''];
							const additionalDressings = bowl.additionalDressings?.components;
							return (
								<>
									<RecipeTitle item={bowl} />
									{bowl.additionalDressings && (
										<p className="italic">
											Requires additional dressings
											{additionalDressings?.length ? ` (${additionalDressings.join(', ')})` : ''}.
											See {parentDressing.name}, page {parentDressing.page}.
										</p>
									)}
								</>
							);
						})}
					</>
				)}
				{!!dressings.length && (
					<>
						<CategoryTitle>Dressings</CategoryTitle>
						{dressings.map(dressing => (
							<RecipeTitle item={dressing} />
						))}
					</>
				)}
			</div>
		</div>
	);
}

export default function AutocompletePage() {
	const [open, setOpen] = useState(false);
	const [value, setValue] = useState('');
	const [submitted, setSubmitted] = useState(false);

	const handleSelect = (currentValue: string) => {
		setValue(currentValue === value ? '' : currentValue);
		setOpen(false);
		setSubmitted(true);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (value) {
			setSubmitted(true);
		}
	};

	const handleBack = () => {
		setSubmitted(false);
		setValue('');
	};

	if (submitted) {
		return <DressingPage onBack={handleBack} dressing={dressingsByName[value]} />;
	}

	return (
		<div className="flex flex-col items-center justify-center min-h-screen p-4">
			<form onSubmit={handleSubmit} className="w-full max-w-3xl">
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							aria-expanded={open}
							className="w-full justify-between text-5xl p-6 pt-8 h-auto font-normal"
						>
							{value
								? dressingOptions.find(option => option.value === value)?.label
								: 'Select a dressing…'}
							<ChevronsUpDown className="ml-2 shrink-0 opacity-50 w-8! h-8!" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-full p-0" style={{ width: 'calc(100% - 2rem)' }}>
						<Command className="w-full">
							<CommandInput placeholder="Search options..." className="text-3xl h-14" />
							<CommandList>
								<CommandEmpty className="text-3xl py-6 text-center">No options found.</CommandEmpty>
								<CommandGroup>
									{dressingOptions.map(option => (
										<CommandItem
											key={option.value}
											value={option.value}
											onSelect={handleSelect}
											className="text-3xl py-3 cursor-pointer"
										>
											<Check
												className={cn(
													'mr-2 h-6 w-6',
													value === option.value ? 'opacity-100' : 'opacity-0'
												)}
											/>
											{option.label}
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
				<button type="submit" className="sr-only">
					Submit
				</button>
			</form>
		</div>
	);
}
