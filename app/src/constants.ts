export const OAK_PARK_CENTER: [number, number] = [41.885, -87.79];

export const UNIT_COLORS: Record<number, string> = {
	2: '#2f7d67',
	3: '#347f9d',
	4: '#6d64a8',
	5: '#a15d7c',
	6: '#c26842',
};

export function unitColor(units: number): string {
	return UNIT_COLORS[units] ?? '#66746f';
}
