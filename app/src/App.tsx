import type { FeatureCollection } from 'geojson';
import {
	Building2,
	Check,
	Download,
	FilterX,
	Menu,
	Share2,
	X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { InfoButton } from './components/InfoButton';
import {
	BoundaryLayer,
	HighlightMarker,
	MapBounds,
	MapPositionSync,
	PropertyMarkers,
} from './components/MapLayers';
import { SearchInput } from './components/SearchInput';
import { OAK_PARK_CENTER, UNIT_COLORS } from './constants';
import type { Property } from './types';

const initialParams = new URLSearchParams(window.location.search);

function useIsMobile() {
	const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
	useEffect(() => {
		const query = window.matchMedia('(max-width: 767px)');
		const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
		query.addEventListener('change', onChange);
		return () => query.removeEventListener('change', onChange);
	}, []);
	return isMobile;
}

function parseOptionalNumber(value: string | null): number | null {
	if (!value) return null;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

export default function App() {
	const isMobile = useIsMobile();
	const [sidebarOpen, setSidebarOpen] = useState(
		() => window.innerWidth >= 768,
	);
	const [properties, setProperties] = useState<Property[]>([]);
	const [boundary, setBoundary] = useState<FeatureCollection | null>(null);
	const [parcels, setParcels] = useState<FeatureCollection | null>(null);
	const [highlighted, setHighlighted] = useState<Property | null>(null);
	const [selectedUnits, setSelectedUnits] = useState<number | null>(() =>
		parseOptionalNumber(initialParams.get('units')),
	);
	const [builtBefore, setBuiltBefore] = useState(
		() => initialParams.get('before') ?? '',
	);
	const [builtAfter, setBuiltAfter] = useState(
		() => initialParams.get('after') ?? '',
	);
	const [showBoundaries, setShowBoundaries] = useState(
		() => initialParams.get('mode') !== 'dots',
	);
	const [mapPosition, setMapPosition] = useState<{
		lat: number;
		lng: number;
		zoom: number;
	} | null>(() => {
		const lat = Number.parseFloat(initialParams.get('lat') ?? '');
		const lng = Number.parseFloat(initialParams.get('lng') ?? '');
		const zoom = Number.parseInt(initialParams.get('z') ?? '', 10);
		return [lat, lng, zoom].every(Number.isFinite) ? { lat, lng, zoom } : null;
	});
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		const base = import.meta.env.BASE_URL;
		Promise.all([
			fetch(`${base}properties.json`).then((response) => response.json()),
			fetch(`${base}boundary.geojson`).then((response) => response.json()),
			fetch(`${base}parcels.geojson`).then((response) => response.json()),
		]).then(([propertyData, boundaryData, parcelData]) => {
			setProperties(propertyData);
			setBoundary(boundaryData);
			setParcels(parcelData);
		});
	}, []);

	const displayed = useMemo(() => {
		const before = parseOptionalNumber(builtBefore);
		const after = parseOptionalNumber(builtAfter);
		return properties.filter((property) => {
			if (selectedUnits !== null && property.units !== selectedUnits)
				return false;
			if (
				before !== null &&
				(!property.yearBuilt || property.yearBuilt >= before)
			) {
				return false;
			}
			if (
				after !== null &&
				(!property.yearBuilt || property.yearBuilt <= after)
			) {
				return false;
			}
			return true;
		});
	}, [properties, selectedUnits, builtBefore, builtAfter]);

	useEffect(() => {
		const params = new URLSearchParams();
		if (selectedUnits !== null) params.set('units', String(selectedUnits));
		if (builtBefore) params.set('before', builtBefore);
		if (builtAfter) params.set('after', builtAfter);
		if (!showBoundaries) params.set('mode', 'dots');
		if (mapPosition) {
			params.set('lat', mapPosition.lat.toFixed(5));
			params.set('lng', mapPosition.lng.toFixed(5));
			params.set('z', String(mapPosition.zoom));
		}
		const query = params.toString();
		window.history.replaceState(
			null,
			'',
			query ? `${window.location.pathname}?${query}` : window.location.pathname,
		);
	}, [selectedUnits, builtBefore, builtAfter, showBoundaries, mapPosition]);

	const resetFilters = () => {
		setSelectedUnits(null);
		setBuiltBefore('');
		setBuiltAfter('');
	};

	const handleMapMove = useCallback(
		(lat: number, lng: number, zoom: number) => {
			setMapPosition({ lat, lng, zoom });
		},
		[],
	);

	function downloadCsv() {
		const headers: (keyof Property)[] = [
			'address',
			'pin',
			'units',
			'yearBuilt',
			'buildingSqft',
			'url',
		];
		const escapeCsv = (value: unknown) =>
			`"${String(value ?? '').replace(/"/g, '""')}"`;
		const csv = [
			headers.join(','),
			...displayed.map((property) =>
				headers.map((header) => escapeCsv(property[header])).join(','),
			),
		].join('\n');
		const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = 'oak-park-middle-housing.csv';
		anchor.click();
		URL.revokeObjectURL(url);
	}

	async function copyShareUrl() {
		await navigator.clipboard.writeText(window.location.href);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1800);
	}

	const initialCenter: [number, number] = mapPosition
		? [mapPosition.lat, mapPosition.lng]
		: OAK_PARK_CENTER;
	const hasFilters =
		selectedUnits !== null || Boolean(builtBefore || builtAfter);

	return (
		<div className="app-shell">
			{isMobile && sidebarOpen && (
				<button
					type="button"
					className="mobile-backdrop"
					onClick={() => setSidebarOpen(false)}
					aria-label="Close filters"
				/>
			)}

			<aside
				className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
			>
				<div className="brand-row">
					<div className="brand-mark">
						<Building2 size={19} />
					</div>
					<div className="brand-copy">
						<h1>Oak Park Middle</h1>
						<p>Find the homes between house and high-rise.</p>
					</div>
					<div className="header-actions">
						<InfoButton />
						<button
							type="button"
							className="icon-button"
							onClick={() => setSidebarOpen(false)}
							aria-label="Close filters"
						>
							<X size={17} />
						</button>
					</div>
				</div>

				<SearchInput properties={properties} onHighlight={setHighlighted} />

				<section className="filter-section">
					<div className="section-heading">
						<div>
							<span className="eyebrow">Property size</span>
							<h2>Number of units</h2>
						</div>
						{selectedUnits !== null && (
							<button
								type="button"
								className="text-button"
								onClick={() => setSelectedUnits(null)}
							>
								Any
							</button>
						)}
					</div>
					<div className="unit-grid">
						{[2, 3, 4, 5, 6].map((units) => (
							<button
								type="button"
								key={units}
								onClick={() =>
									setSelectedUnits(selectedUnits === units ? null : units)
								}
								className={`unit-button ${selectedUnits === units ? 'unit-button-active' : ''}`}
								style={
									{ '--unit-color': UNIT_COLORS[units] } as React.CSSProperties
								}
							>
								<span className="unit-dot" />
								<strong>{units}</strong>
								<span>units</span>
							</button>
						))}
					</div>
				</section>

				<section className="filter-section">
					<div className="section-heading">
						<div>
							<span className="eyebrow">Property age</span>
							<h2>Year built</h2>
						</div>
					</div>
					<div className="year-grid">
						<label>
							<span>After</span>
							<input
								type="number"
								inputMode="numeric"
								min="1800"
								max="2026"
								placeholder="Any year"
								value={builtAfter}
								onChange={(event) => setBuiltAfter(event.target.value)}
							/>
						</label>
						<label>
							<span>Before</span>
							<input
								type="number"
								inputMode="numeric"
								min="1800"
								max="2027"
								placeholder="e.g. 1950"
								value={builtBefore}
								onChange={(event) => setBuiltBefore(event.target.value)}
							/>
						</label>
					</div>
					<div className="preset-row">
						{[1920, 1940, 1950].map((year) => (
							<button
								type="button"
								key={year}
								onClick={() => setBuiltBefore(String(year))}
							>
								Pre-{year}
							</button>
						))}
					</div>
				</section>

				<section className="results-card" aria-live="polite">
					<div>
						<strong>{displayed.length.toLocaleString()}</strong>
						<span> matching properties</span>
					</div>
					<p>
						{properties.length
							? `From ${properties.length.toLocaleString()} verified two- to six-unit properties.`
							: 'Loading property records…'}
					</p>
				</section>

				<div className="sidebar-actions">
					<button type="button" onClick={resetFilters} disabled={!hasFilters}>
						<FilterX size={15} /> Clear filters
					</button>
					<button
						type="button"
						onClick={downloadCsv}
						disabled={!displayed.length}
					>
						<Download size={15} /> Download CSV
					</button>
				</div>
			</aside>

			<main className="map-wrap">
				<div className="map-toolbar">
					{!sidebarOpen && (
						<button
							type="button"
							className="map-control"
							onClick={() => setSidebarOpen(true)}
							aria-label="Open filters"
						>
							<Menu size={18} />
						</button>
					)}
					<button
						type="button"
						className="map-control share-control"
						onClick={copyShareUrl}
						aria-label="Copy share link"
					>
						{copied ? <Check size={18} /> : <Share2 size={18} />}
						<span>{copied ? 'Copied' : 'Share'}</span>
					</button>
				</div>
				<fieldset className="mode-switch" aria-label="Map display style">
					<button
						type="button"
						className={showBoundaries ? 'active' : ''}
						onClick={() => setShowBoundaries(true)}
					>
						Parcels
					</button>
					<button
						type="button"
						className={!showBoundaries ? 'active' : ''}
						onClick={() => setShowBoundaries(false)}
					>
						Dots
					</button>
				</fieldset>
				<MapContainer
					center={initialCenter}
					zoom={mapPosition?.zoom ?? 14}
					preferCanvas
					className="map"
				>
					<TileLayer
						url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
						attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
						maxZoom={19}
					/>
					<MapBounds properties={properties} skip={mapPosition !== null} />
					<MapPositionSync onMove={handleMapMove} />
					{boundary && <BoundaryLayer boundary={boundary} />}
					<PropertyMarkers
						properties={displayed}
						parcels={parcels}
						showBoundaries={showBoundaries}
					/>
					<HighlightMarker property={highlighted} />
				</MapContainer>
			</main>
		</div>
	);
}
