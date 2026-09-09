/**
 * NourishNet - Interactive Proximity Radar & Leaflet Map Module
 * Visualizes Donors, NGOs, live radius coverage circles, and routing connections
 */

const MapRadar = {
  map: null,
  markersLayer: null,
  circlesLayer: null,
  routeLayer: null,
  currentNgoMarker: null,
  activeListingId: null,

  init() {
    const mapElement = document.getElementById("radar-map-container");
    if (!mapElement) return;

    // Check if Leaflet is loaded
    if (typeof L === "undefined") {
      console.warn("Leaflet library not found, radar fallback will be used.");
      return;
    }

    // Default center (New Delhi / Metropolitan Area)
    const initialLat = 28.6139;
    const initialLng = 77.2090;

    if (!this.map) {
      this.map = L.map("radar-map-container", {
        zoomControl: false,
        attributionControl: false
      }).setView([initialLat, initialLng], 13);

      // Add modern CartoDB Positron dark/light friendly tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(this.map);

      // Add custom zoom control in bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(this.map);

      this.markersLayer = L.layerGroup().addTo(this.map);
      this.circlesLayer = L.layerGroup().addTo(this.map);
      this.routeLayer = L.layerGroup().addTo(this.map);
    }

    this.renderMap();
  },

  /**
   * Re-renders all markers, NGO radius circle, and active routes
   */
  renderMap() {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();
    this.circlesLayer.clearLayers();
    this.routeLayer.clearLayers();

    const activeNgo = AppState.getActiveNgo();
    const listings = AppState.getFoodListings().filter(item => item.status === "available" || item.status === "claimed");

    if (activeNgo) {
      // 1. Center map around active NGO
      this.map.setView([activeNgo.lat, activeNgo.lng], 13);

      // 2. Add NGO Base Marker
      const ngoIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div class="ngo-marker-pin">
            <i class="fas fa-building-ngo"></i>
            <span class="marker-pulse"></span>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      });

      this.currentNgoMarker = L.marker([activeNgo.lat, activeNgo.lng], { icon: ngoIcon })
        .addTo(this.markersLayer)
        .bindPopup(`
          <div class="map-popup-card">
            <span class="popup-badge ngo-badge"><i class="fas fa-hand-holding-heart"></i> Active NGO Base</span>
            <h4>${activeNgo.name}</h4>
            <p><i class="fas fa-location-dot"></i> ${activeNgo.address}</p>
            <p><i class="fas fa-people-group"></i> Capacity: <strong>${activeNgo.capacityServings} servings</strong></p>
            <p><i class="fas fa-truck"></i> Transport: ${activeNgo.vehicleType}</p>
          </div>
        `);

      // 3. Add Radius Range Ring (5km & 10km zones)
      const radiusCircle5km = L.circle([activeNgo.lat, activeNgo.lng], {
        radius: 5000,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.06,
        weight: 1.5,
        dashArray: '4, 6'
      }).addTo(this.circlesLayer);

      const radiusCircle10km = L.circle([activeNgo.lat, activeNgo.lng], {
        radius: 10000,
        color: '#6366f1',
        fillColor: '#6366f1',
        fillOpacity: 0.02,
        weight: 1,
        dashArray: '6, 8'
      }).addTo(this.circlesLayer);
    }

    // 4. Add Food Listing Pins
    listings.forEach(listing => {
      const evaluation = PriorityEngine.evaluatePriority(listing, activeNgo);
      const isUrgent = evaluation.tier === "critical";
      const isHigh = evaluation.tier === "high";

      let markerClass = "food-pin normal";
      let badgeClass = "badge-normal";
      if (isUrgent) {
        markerClass = "food-pin urgent pulse-urgent";
        badgeClass = "badge-urgent";
      } else if (isHigh) {
        markerClass = "food-pin high";
        badgeClass = "badge-high";
      }

      const foodIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div class="${markerClass}" data-id="${listing.id}">
            <i class="fas fa-utensils"></i>
            <span class="pin-servings">${listing.servings}</span>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const marker = L.marker([listing.lat, listing.lng], { icon: foodIcon })
        .addTo(this.markersLayer)
        .bindPopup(`
          <div class="map-popup-card">
            <div class="popup-header">
              <span class="priority-tag ${badgeClass}">${evaluation.tierLabel}</span>
              <span class="popup-dist"><i class="fas fa-route"></i> ${evaluation.distanceKm} km</span>
            </div>
            <h4>${listing.title}</h4>
            <p class="donor-name"><i class="fas fa-store"></i> ${listing.donorName}</p>
            <div class="popup-stats">
              <div><strong>${listing.servings}</strong><span>Servings</span></div>
              <div><strong>${listing.quantityKg} kg</strong><span>Weight</span></div>
              <div class="urgent-stat"><strong>${PriorityEngine.formatCountdown(evaluation.remainingMinutes)}</strong><span>Expires</span></div>
            </div>
            <p class="popup-storage"><i class="fas fa-box"></i> ${listing.storageType}</p>
            <div class="popup-actions">
              <button class="btn btn-sm btn-primary" onclick="MapRadar.highlightRoute('${listing.id}')">
                <i class="fas fa-location-arrow"></i> Trace Route
              </button>
              <button class="btn btn-sm btn-success" onclick="AppState.openClaimModal('${listing.id}')">
                <i class="fas fa-truck-fast"></i> Claim
              </button>
            </div>
          </div>
        `);

      marker.on('click', () => {
        this.highlightRoute(listing.id);
      });
    });
  },

  /**
   * Draw direct animated route line between active NGO and Donor
   */
  highlightRoute(listingId) {
    if (!this.map || !this.routeLayer) return;
    this.routeLayer.clearLayers();

    const activeNgo = AppState.getActiveNgo();
    const listing = AppState.getFoodListings().find(l => l.id === listingId);
    if (!activeNgo || !listing) return;

    this.activeListingId = listingId;

    const latlngs = [
      [activeNgo.lat, activeNgo.lng],
      [listing.lat, listing.lng]
    ];

    // Add polyline with gradient style
    const routeLine = L.polyline(latlngs, {
      color: '#f59e0b',
      weight: 4,
      opacity: 0.85,
      dashArray: '8, 8',
      className: 'animated-route-line'
    }).addTo(this.routeLayer);

    // Zoom map to fit both endpoints
    this.map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60] });

    // Show toast
    const dist = PriorityEngine.calculateDistance(activeNgo.lat, activeNgo.lng, listing.lat, listing.lng);
    const etaMins = Math.round((dist / 30) * 60) + 10; // avg 30km/h city transit + 10m pickup
    AppState.showToast(`📍 Route mapped: ${dist} km away. Estimated Volunteer ETA: ~${etaMins} mins.`, 'info');
  }
};

window.MapRadar = MapRadar;
