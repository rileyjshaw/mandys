import cnz from 'cnz';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: any) {
	return twMerge(cnz(inputs));
}
