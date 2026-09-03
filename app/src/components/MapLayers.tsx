import type { FeatureCollection } from 'geojson';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import { unitColor } from '../constants';
import type { Property } from '../types';

export function MapBounds({
	properties,
	skip,
}: {
	properties: Property[];
	skip?: boolean;
}) {
	const map = useMap();
	const didFit = useRef(false);
	useEffect(() => {
		if (skip || didFit.current || !properties.length) return;
		didFit.current = true;
		map.fitBounds(
			properties.map((property) => [property.lat, property.lon]),
			{
				padding: [24, 24],
			},
		);
	}, [properties, map, skip]);
	return null;
}

export function MapPositionSync({
	onMove,
}: {
	onMove: (lat: number, lng: number, zoom: number) => void;
}) {
	const map = useMap();
	useEffect(() => {
		const handler = () => {
			const { lat, lng } = map.getCenter();
			onMove(lat, lng, map.getZoom());
		};
		map.on('moveend', handler);
		return () => {
			map.off('moveend', handler);
		};
	}, [map, onMove]);
	return null;
}

/** Keep Leaflet aligned with Safari's changing visual viewport and drawer state. */
export function MapViewportSync() {
	const map = useMap();
	useEffect(() => {
		let frame = 0;
		const refresh = () => {
			window.cancelAnimationFrame(frame);
			frame = window.requestAnimationFrame(() =>
				map.invalidateSize({ pan: false }),
			);
		};
		const observer = new ResizeObserver(refresh);
		observer.observe(map.getContainer());
		window.addEventListener('resize', refresh);
		window.visualViewport?.addEventListener('resize', refresh);
		refresh();
		return () => {
			window.cancelAnimationFrame(frame);
			observer.disconnect();
			window.removeEventListener('resize', refresh);
			window.visualViewport?.removeEventListener('resize', refresh);
		};
	}, [map]);
	return null;
}

export function BoundaryLayer({ boundary }: { boundary: FeatureCollection }) {
	const map = useMap();
	useEffect(() => {
		const layer = L.geoJSON(boundary, {
			style: { color: '#173f35', weight: 2, fillOpacity: 0, dashArray: '7 6' },
			interactive: false,
		}).addTo(map);
		return () => {
			map.removeLayer(layer);
		};
	}, [boundary, map]);
	return null;
}

function popup(property: Property): HTMLElement {
	const container = document.createElement('div');
	container.className = 'property-popup';
	const squareFeet = property.buildingSqft
		? `${property.buildingSqft.toLocaleString()} building sq ft`
		: 'Building size unavailable';
	container.innerHTML = `
		<div class="popup-kicker">${property.units}-unit property</div>
		<strong>${property.address || 'Address unavailable'}</strong>
		<div class="popup-facts">
			<span>Built ${property.yearBuilt || 'unknown'}</span>
			<span>${squareFeet}</span>
		</div>
		<a class="assessor-link" href="${property.url}" target="_blank" rel="noopener noreferrer">
			<span>Cook County Assessor</span>
			<strong>View property record ↗</strong>
		</a>
		<a class="pin-link" href="${property.url}" target="_blank" rel="noopener noreferrer">PIN ${property.pin}</a>
	`;
	return container;
}

function markerRadius(zoom: number): number {
	if (zoom <= 15) return 3;
	if (zoom <= 16) return 4;
	if (zoom <= 17) return 5;
	return 7;
}

export function PropertyMarkers({
	properties,
	parcels,
	showBoundaries,
}: {
	properties: Property[];
	parcels: FeatureCollection | null;
	showBoundaries: boolean;
}) {
	const map = useMap();
	const layerRef = useRef<L.LayerGroup | null>(null);
	const rendererRef = useRef<L.Canvas | null>(null);
	const [radius, setRadius] = useState(() => markerRadius(map.getZoom()));

	useEffect(() => {
		const onZoom = () => setRadius(markerRadius(map.getZoom()));
		map.on('zoomend', onZoom);
		return () => {
			map.off('zoomend', onZoom);
		};
	}, [map]);

	useEffect(() => {
		if (!map.getPane('properties')) {
			const pane = map.createPane('properties');
			pane.style.zIndex = '460';
		}
		if (!rendererRef.current)
			rendererRef.current = L.canvas({ padding: 0.5, pane: 'properties' });
		if (!layerRef.current) layerRef.current = L.layerGroup().addTo(map);

		const layer = layerRef.current;
		const renderer = rendererRef.current;
		layer.clearLayers();
		const byPin = new Map(
			properties.map((property) => [property.pin, property]),
		);
		const renderedPins = new Set<string>();

		if (showBoundaries && parcels) {
			for (const feature of parcels.features) {
				const pin = feature.properties?.pin ?? feature.properties?.name;
				const property = byPin.get(pin);
				if (!property || renderedPins.has(pin) || !feature.geometry) continue;
				const color = unitColor(property.units);
				const options = {
					style: { color, fillColor: color, fillOpacity: 0.62, weight: 1.5 },
					pane: 'properties',
					renderer,
				} as L.GeoJSONOptions;
				L.geoJSON(feature, options)
					.bindPopup(() => popup(property))
					.addTo(layer);
				renderedPins.add(pin);
			}
		}

		for (const property of properties) {
			if (renderedPins.has(property.pin)) continue;
			const color = unitColor(property.units);
			L.circleMarker([property.lat, property.lon], {
				radius,
				color: '#fff',
				fillColor: color,
				fillOpacity: 0.92,
				weight: 1.5,
				renderer,
				pane: 'properties',
			})
				.bindPopup(() => popup(property))
				.addTo(layer);
		}

		return () => {
			layer.clearLayers();
		};
	}, [properties, parcels, showBoundaries, map, radius]);
	return null;
}

export function HighlightMarker({ property }: { property: Property | null }) {
	const map = useMap();
	useEffect(() => {
		if (!property) return;
		map.setView([property.lat, property.lon], 18);
		const marker = L.circleMarker([property.lat, property.lon], {
			radius: 13,
			color: '#e9a33d',
			fillColor: unitColor(property.units),
			fillOpacity: 1,
			weight: 4,
		})
			.bindPopup(() => popup(property))
			.addTo(map)
			.openPopup();
		return () => {
			map.removeLayer(marker);
		};
	}, [property, map]);
	return null;
}
