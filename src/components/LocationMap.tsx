import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Navigation, Layers, ZoomIn } from 'lucide-react';

// Set Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiYmxpdHpqYiIsImEiOiJjbTEweDAzb20wOGhiMnRwZGNqZ2NsdXF6In0.DhETe3EckUcqEAvDDQsfLA';

interface LocationMapProps {
  location: string;
  className?: string;
}

export function LocationMap({ location, className = "h-72 w-full rounded-md overflow-hidden" }: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [locationDetails, setLocationDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<string>('mapbox://styles/mapbox/streets-v11');

  // Geocode the location to get coordinates and details
  useEffect(() => {
    const geocodeLocation = async () => {
      try {
        const encodedLocation = encodeURIComponent(location);
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedLocation}.json?access_token=${mapboxgl.accessToken}&types=address,place,poi&limit=1`
        );

        if (!response.ok) {
          throw new Error(`Geocoding error: ${response.status}`);
        }

        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          const [lng, lat] = feature.center;
          setCoordinates([lng, lat]);
          setLocationDetails(feature);
        } else {
          setError("Location not found");
        }
      } catch (err) {
        console.error("Geocoding error:", err);
        setError("Could not load map location");
      } finally {
        setIsLoading(false);
      }
    };

    if (location) {
      geocodeLocation();
    }
  }, [location]);

  // Initialize map when coordinates are available
  useEffect(() => {
    if (coordinates && mapContainer.current && !map.current) {
      // Create map with detailed styling
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: coordinates,
        zoom: 14,
        attributionControl: true,
        pitch: 40, // Add a slight tilt for 3D effect
        bearing: -10, // Slight rotation
      });

      // Add controls for a more detailed map experience
      map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'bottom-right');
      map.current.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      }), 'bottom-right');

      // Create a popup with location details
      popup.current = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 25,
        className: 'custom-popup'
      })
      .setHTML(`
        <div class="p-2">
          <h3 class="font-bold text-sm">${locationDetails?.text || location}</h3>
          <p class="text-xs text-gray-600">${locationDetails?.place_name || ''}</p>
        </div>
      `);

      // Add a custom marker with popup
      marker.current = new mapboxgl.Marker({
        color: '#805AD5',
        scale: 1.2,
      })
      .setLngLat(coordinates)
      .setPopup(popup.current)
      .addTo(map.current);

      // Show popup by default
      popup.current.addTo(map.current);

      // Add 3D buildings layer for more detail (like Google Maps)
      map.current.on('load', () => {
        // Add 3D buildings if they're not already in the style
        if (!map.current?.getLayer('3d-buildings')) {
          // Add 3D buildings
          map.current?.addLayer({
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 14,
            'paint': {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'],
                14, 0,
                16, ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate', ['linear'], ['zoom'],
                14, 0,
                16, ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }
          });
        }

        // Add points of interest for more detail
        map.current?.addSource('poi', {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-streets-v8'
        });

        map.current?.addLayer({
          id: 'poi-labels',
          type: 'symbol',
          source: 'poi',
          'source-layer': 'poi_label',
          minzoom: 14,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 12,
            'text-anchor': 'top',
            'text-offset': [0, 1],
            'icon-image': ['concat', ['get', 'maki'], '-15'],
            'icon-size': 1,
            'text-max-width': 8
          },
          paint: {
            'text-color': '#666',
            'text-halo-color': '#fff',
            'text-halo-width': 1
          }
        });
      });

      // Handle errors
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e.error);
      });

      // Cleanup
      return () => {
        if (map.current) {
          map.current.remove();
          map.current = null;
          marker.current = null;
          popup.current = null;
        }
      };
    }
  }, [coordinates, locationDetails, mapStyle]);

  // Function to change map style
  const changeMapStyle = (style: string) => {
    setMapStyle(style);
    if (map.current) {
      map.current.setStyle(style);

      // Re-add the marker after style change
      map.current.once('style.load', () => {
        // Re-add 3D buildings and other layers that might be lost during style change
        if (!map.current?.getLayer('3d-buildings')) {
          map.current?.addLayer({
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 14,
            'paint': {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'interpolate', ['linear'], ['zoom'],
                14, 0,
                16, ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate', ['linear'], ['zoom'],
                14, 0,
                16, ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }
          });
        }
      });
    }
  };

  if (error) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center`}>
        <div className="text-center text-gray-500">
          <MapPin className="h-10 w-10 mx-auto mb-2" />
          <p>{error}</p>
          <p className="text-sm mt-2">{location}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center`}>
        <div className="text-center text-gray-500">
          <div className="h-10 w-10 border-4 border-event-purple border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p>Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={mapContainer} className={className} />

      {/* Map style controls */}
      <div className="absolute top-2 right-2 bg-white rounded-md shadow-md p-1 z-10">
        <button
          onClick={() => changeMapStyle('mapbox://styles/mapbox/streets-v11')}
          className="p-1 hover:bg-gray-100 rounded-md"
          title="Streets"
        >
          <Layers size={16} />
        </button>
        <button
          onClick={() => changeMapStyle('mapbox://styles/mapbox/satellite-streets-v11')}
          className="p-1 hover:bg-gray-100 rounded-md ml-1"
          title="Satellite"
        >
          <Navigation size={16} />
        </button>
        <button
          onClick={() => {
            if (map.current) {
              map.current.zoomIn();
            }
          }}
          className="p-1 hover:bg-gray-100 rounded-md ml-1"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      {/* Location info */}
      <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 rounded-md shadow-md p-2 z-10 max-w-[80%]">
        <h3 className="font-bold text-sm truncate">{locationDetails?.text || location}</h3>
        <p className="text-xs text-gray-600 truncate">{locationDetails?.place_name || ''}</p>
      </div>
    </div>
  );
}
