export interface Property {
	pin: string;
	address: string;
	lat: number;
	lon: number;
	class: string;
	description: string;
	units: number;
	yearBuilt: number | null;
	buildingSqft: number | null;
	url: string;
}
