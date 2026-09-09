/**
 * NourishNet - Main Application Controller
 * Handles UI interactions, live timers, donor form submissions, state management, and analytics
 */

const STORAGE_KEY = "nourishnet_data_v1";

const AppState = {
  data: {
    ngos: [],
    donors: [],
    foodListings: [],
    activeNgoId: "ngo-1",
    selectedFilter: "all",
    selectedSort: "smart",
    searchQuery: "",
    theme: "dark"
  },

  init() {
    this.loadData();
    this.setupEventListeners();
    this.startLiveCountdown();
    this.renderAll();
    
    // Initialize Map on startup
    setTimeout(() => {
      if (window.MapRadar) {
        window.MapRadar.init();
      }
      this.initAnalyticsChart();
    }, 200);
  },

  loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.data = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse local storage data, using defaults.", e);
        this.resetDefaults();
      }
    } else {
      this.resetDefaults();
    }
  },

  resetDefaults() {
    this.data.ngos = [...window.NourishData.ngos];
    this.data.donors = [...window.NourishData.donors];
    this.data.foodListings = [...window.NourishData.foodListings];
    this.data.activeNgoId = "ngo-1";
    this.data.selectedFilter = "all";
    this.data.selectedSort = "smart";
    this.data.searchQuery = "";
    this.data.theme = "dark";
    this.saveData();
  },

  saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  },

  getFoodListings() {
    return this.data.foodListings;
  },

  getNgos() {
    return this.data.ngos;
  },

  getDonors() {
    return this.data.donors;
  },

  getActiveNgo() {
    return this.data.ngos.find(n => n.id === this.data.activeNgoId) || this.data.ngos[0];
  },

  setActiveNgo(ngoId) {
    this.data.activeNgoId = ngoId;
    this.saveData();
    this.renderAll();
    if (window.MapRadar) {
      window.MapRadar.renderMap();
    }
    const ngo = this.getActiveNgo();
    this.showToast(`Switched active NGO base to: ${ngo.name}`, 'info');
  },

  /**
   * Main render orchestrator
   */
  renderAll() {
    this.renderNgoSelector();
    this.renderFoodQueue();
    this.renderImpactStats();
    this.renderDonorSelectOptions();
    if (window.MapRadar && window.MapRadar.map) {
      window.MapRadar.renderMap();
    }
  },

  /**
   * Render NGO profile selector dropdown
   */
  renderNgoSelector() {
    const container = document.getElementById("active-ngo-dropdown");
    if (!container) return;

    const activeNgo = this.getActiveNgo();
    container.innerHTML = this.data.ngos.map(ngo => `
      <option value="${ngo.id}" ${ngo.id === activeNgo.id ? 'selected' : ''}>
        ${ngo.name} (${ngo.capacityServings} meals cap)
      </option>
    `).join('');

    const badge = document.getElementById("current-ngo-badge");
    if (badge) {
      badge.innerHTML = `<i class="fas fa-building-ngo"></i> ${activeNgo.name} &bull; ${activeNgo.vehicleType}`;
    }
  },

  /**
   * Render Prioritized Surplus Food Queue
   */
  renderFoodQueue() {
    const container = document.getElementById("prioritized-listings-grid");
    const countBadge = document.getElementById("queue-count-badge");
    const urgentBanner = document.getElementById("urgent-sos-banner");
    if (!container) return;

    const activeNgo = this.getActiveNgo();
    let listings = [...this.data.foodListings];

    // Filter by search query
    if (this.data.searchQuery) {
      const q = this.data.searchQuery.toLowerCase();
      listings = listings.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.donorName.toLowerCase().includes(q) ||
        l.foodType.toLowerCase().includes(q) ||
        l.pickupAddress.toLowerCase().includes(q)
      );
    }

    // Filter by food category
    if (this.data.selectedFilter !== "all") {
      listings = listings.filter(l => l.foodType === this.data.selectedFilter);
    }

    // Filter by status tab if applicable
    const activeStatusTab = document.querySelector(".status-tab-btn.active")?.dataset.status || "available";
    if (activeStatusTab === "available") {
      listings = listings.filter(l => l.status === "available");
    } else if (activeStatusTab === "claimed") {
      listings = listings.filter(l => l.status === "claimed" || l.status === "collected");
    } else if (activeStatusTab === "delivered") {
      listings = listings.filter(l => l.status === "delivered");
    }

    // Apply Sorting via Algorithm
    const sortedListings = PriorityEngine.sortListings(listings, activeNgo, this.data.selectedSort);

    if (countBadge) {
      countBadge.textContent = `${sortedListings.length} Batches`;
    }

    // Check for urgent SOS items (<45 mins or critical score)
    const urgentItems = sortedListings.filter(l => l.status === "available" && l.evaluation.tier === "critical");
    if (urgentBanner) {
      if (urgentItems.length > 0 && activeStatusTab === "available") {
        urgentBanner.style.display = "flex";
        urgentBanner.innerHTML = `
          <div class="urgent-sos-content">
            <span class="sos-icon-pulse"><i class="fas fa-radiation"></i></span>
            <div>
              <strong>🚨 URGENT REDISTRIBUTION ALERT:</strong>
              <span>${urgentItems.length} surplus food ${urgentItems.length === 1 ? 'batch' : 'batches'} expiring within 60 minutes nearby! Prioritize immediate dispatch.</span>
            </div>
          </div>
          <button class="btn btn-sm btn-light" onclick="AppState.setSort('urgency')">
            <i class="fas fa-bolt"></i> View Most Urgent
          </button>
        `;
      } else {
        urgentBanner.style.display = "none";
      }
    }

    if (sortedListings.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-icon"><i class="fas fa-clipboard-check"></i></div>
          <h3>No Surplus Food Found</h3>
          <p>No food listings match the current category and status filters.</p>
          <button class="btn btn-outline" onclick="AppState.resetFilters()">
            <i class="fas fa-rotate-left"></i> Reset Filters
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = sortedListings.map(item => {
      const evalData = item.evaluation;
      const countdownStr = PriorityEngine.formatCountdown(evalData.remainingMinutes);
      const isUrgent = evalData.tier === "critical";

      return `
        <div class="food-card ${item.status} ${isUrgent ? 'card-urgent' : ''}" id="card-${item.id}">
          <div class="card-header">
            <div class="header-left">
              <span class="priority-pill ${evalData.badgeClass}">
                <i class="fas ${evalData.tierIcon}"></i> ${evalData.tierLabel}
              </span>
              <span class="category-pill">${item.foodType}</span>
            </div>
            <div class="score-badge" title="Priority Score: ${evalData.totalScore}/100 based on Distance (${evalData.breakdown.distanceScore} pts), Urgency (${evalData.breakdown.urgencyScore} pts), Quantity (${evalData.breakdown.quantityScore} pts)">
              <span class="score-num">${evalData.totalScore}</span>
              <span class="score-lbl">Score</span>
            </div>
          </div>

          <div class="card-body">
            <h3 class="food-title">${item.title}</h3>
            
            <div class="donor-meta">
              <i class="fas fa-store-alt text-emerald"></i>
              <strong>${item.donorName}</strong>
              <span class="donor-cat-badge">${item.donorCategory}</span>
            </div>

            <!-- Priority Metrics Grid -->
            <div class="metrics-grid">
              <div class="metric-box">
                <i class="fas fa-route text-amber"></i>
                <div>
                  <span class="metric-val">${evalData.distanceKm} km</span>
                  <span class="metric-lbl">Distance</span>
                </div>
              </div>
              <div class="metric-box">
                <i class="fas fa-clock ${isUrgent ? 'text-danger' : 'text-emerald'}"></i>
                <div>
                  <span class="metric-val countdown-text" data-expiry="${item.expiryTime}">
                    ${countdownStr}
                  </span>
                  <span class="metric-lbl">Shelf-Life</span>
                </div>
              </div>
              <div class="metric-box">
                <i class="fas fa-utensils text-emerald"></i>
                <div>
                  <span class="metric-val">${item.servings} Meals</span>
                  <span class="metric-lbl">${item.quantityKg} kg</span>
                </div>
              </div>
            </div>

            <!-- Food Specs -->
            <div class="food-specs-list">
              <div class="spec-item"><i class="fas fa-temperature-arrow-up"></i> ${item.storageType}</div>
              <div class="spec-item"><i class="fas fa-leaf"></i> ${item.dietType}</div>
              <div class="spec-item"><i class="fas fa-shield-virus"></i> Hygiene Verified</div>
            </div>

            <div class="pickup-snippet">
              <i class="fas fa-location-dot"></i>
              <span>${item.pickupAddress}</span>
            </div>
          </div>

          <div class="card-footer">
            ${item.status === 'available' ? `
              <button class="btn btn-outline-primary btn-sm" onclick="MapRadar.highlightRoute('${item.id}')">
                <i class="fas fa-map-location-dot"></i> Route
              </button>
              <button class="btn btn-success flex-1" onclick="AppState.openClaimModal('${item.id}')">
                <i class="fas fa-truck-fast"></i> Claim Rescue
              </button>
            ` : item.status === 'claimed' || item.status === 'collected' ? `
              <button class="btn btn-warning flex-1" onclick="Tracker.openTrackingModal('${item.id}')">
                <i class="fas fa-route"></i> Track Active Transit
              </button>
            ` : `
              <button class="btn btn-outline flex-1" onclick="Tracker.openCertificateModal('${item.id}')">
                <i class="fas fa-certificate text-emerald"></i> View Certificate
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Live timer that runs every 10 seconds to update remaining shelf life countdowns
   */
  startLiveCountdown() {
    setInterval(() => {
      // Update countdown text elements
      document.querySelectorAll(".countdown-text").forEach(el => {
        const expiry = el.dataset.expiry;
        if (expiry) {
          const mins = PriorityEngine.getRemainingMinutes(expiry);
          el.textContent = PriorityEngine.formatCountdown(mins);
          if (mins <= 45 && mins > 0) {
            el.classList.add("text-danger");
          }
        }
      });
    }, 10000);
  },

  /**
   * Open Modal to claim a pickup
   */
  openClaimModal(listingId) {
    const listing = this.data.foodListings.find(l => l.id === listingId);
    const activeNgo = this.getActiveNgo();
    if (!listing || !activeNgo) return;

    const modal = document.getElementById("claim-confirm-modal");
    const container = document.getElementById("claim-modal-details");
    if (!modal || !container) return;

    const evaluation = PriorityEngine.evaluatePriority(listing, activeNgo);

    container.innerHTML = `
      <div class="claim-summary-card">
        <div class="claim-header-row">
          <span class="priority-pill ${evaluation.badgeClass}">${evaluation.tierLabel}</span>
          <span class="text-muted"><i class="fas fa-road"></i> ${evaluation.distanceKm} km away</span>
        </div>
        <h4>${listing.title}</h4>
        <p class="donor-details"><strong>Donor:</strong> ${listing.donorName} (${listing.donorCategory})</p>
        
        <div class="summary-stat-pills">
          <div class="pill"><strong>${listing.servings}</strong> Servings</div>
          <div class="pill"><strong>${listing.quantityKg} kg</strong> Weight</div>
          <div class="pill ${evaluation.tier === 'critical' ? 'pill-urgent' : ''}"><strong>${PriorityEngine.formatCountdown(evaluation.remainingMinutes)}</strong> Window</div>
        </div>

        <div class="ngo-assign-box">
          <label><i class="fas fa-building-ngo"></i> Rescuing NGO Organization:</label>
          <div class="ngo-name-display">${activeNgo.name}</div>
          <small class="text-muted">Capacity: ${activeNgo.capacityServings} people | Transit: ${activeNgo.vehicleType}</small>
        </div>

        <div class="form-group" style="margin-top: 1rem;">
          <label for="volunteer-rider-name"><i class="fas fa-id-badge"></i> Assign Volunteer / Driver Name:</label>
          <input type="text" id="volunteer-rider-name" class="form-input" value="Volunteer Captain Rahul" placeholder="Enter volunteer name" />
        </div>

        <div class="handover-notice">
          <i class="fas fa-info-circle"></i>
          <span>Upon confirmation, a secure 4-digit handover OTP will be required to verify collection at the donor venue.</span>
        </div>

        <div class="modal-buttons-row">
          <button class="btn btn-outline" onclick="document.getElementById('claim-confirm-modal').classList.remove('active')">
            Cancel
          </button>
          <button class="btn btn-success" onclick="AppState.confirmClaim('${listing.id}')">
            <i class="fas fa-check-circle"></i> Confirm & Dispatch Volunteer
          </button>
        </div>
      </div>
    `;

    modal.classList.add("active");
  },

  confirmClaim(listingId) {
    const riderInput = document.getElementById("volunteer-rider-name");
    const riderName = riderInput ? riderInput.value : "Volunteer Rider";
    const activeNgo = this.getActiveNgo();

    const success = Tracker.claimPickup(listingId, activeNgo.id, riderName);
    if (success) {
      document.getElementById("claim-confirm-modal").classList.remove("active");
    }
  },

  /**
   * Handle Donor Post Submission
   */
  handleDonorSubmit(event) {
    event.preventDefault();
    const form = event.target;

    const donorName = form.donorName.value.trim();
    const donorCategory = form.donorCategory.value;
    const title = form.foodTitle.value.trim();
    const foodType = form.foodType.value;
    const servings = parseInt(form.servings.value) || 50;
    const quantityKg = parseFloat(form.quantityKg.value) || 20;
    const expiryHours = parseFloat(form.expiryHours.value) || 2;
    const storageType = form.storageType.value;
    const pickupAddress = form.pickupAddress.value.trim();
    const notes = form.notes.value.trim();
    const dietType = form.dietType.value;

    if (!donorName || !title || !pickupAddress) {
      this.showToast("Please fill all required fields.", "error");
      return;
    }

    // Generate simulated coordinates close to city center with slight jitter
    const baseLat = 28.6139 + (Math.random() - 0.5) * 0.08;
    const baseLng = 77.2090 + (Math.random() - 0.5) * 0.08;
    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const newListing = {
      id: "food-" + Date.now(),
      donorId: "donor-custom-" + Date.now(),
      donorName: donorName,
      donorCategory: donorCategory,
      title: title,
      foodType: foodType,
      storageType: storageType,
      quantityKg: quantityKg,
      servings: servings,
      dietType: dietType,
      prepTime: new Date().toISOString(),
      expiryTime: new Date(Date.now() + expiryHours * 60 * 60000).toISOString(),
      pickupAddress: pickupAddress,
      lat: baseLat,
      lng: baseLng,
      status: "available",
      verificationOtp: randomOtp,
      claimedBy: null,
      claimedAt: null,
      notes: notes || "Surplus food packaged in clean containers.",
      allergens: "Standard",
      hygieneChecked: true,
      createdAt: new Date().toISOString()
    };

    this.data.foodListings.unshift(newListing);
    this.saveData();
    this.renderAll();

    form.reset();
    document.getElementById("donor-post-modal")?.classList.remove("active");

    // Play chime / toast
    this.showToast(`🎉 Food donation posted successfully! Priority matching activated. Handover OTP: ${randomOtp}`, "success");

    // Switch view to NGO rescues tab to highlight the new post
    this.switchTab("rescues");
  },

  /**
   * Impact Statistics calculation
   */
  renderImpactStats() {
    const all = this.data.foodListings;
    const delivered = all.filter(l => l.status === "delivered");
    const active = all.filter(l => l.status === "available" || l.status === "claimed");

    // Aggregate totals including historical baseline
    const totalServings = delivered.reduce((sum, item) => sum + item.servings, 4850);
    const totalKg = delivered.reduce((sum, item) => sum + item.quantityKg, 1920);
    const co2Saved = (totalKg * 2.5).toFixed(0);
    const waterSaved = ((totalKg * 300) / 1000).toFixed(1); // in kL

    const mealsEl = document.getElementById("stat-total-meals");
    const kgEl = document.getElementById("stat-total-kg");
    const co2El = document.getElementById("stat-total-co2");
    const waterEl = document.getElementById("stat-total-water");
    const activeEl = document.getElementById("stat-active-batches");

    if (mealsEl) mealsEl.textContent = totalServings.toLocaleString();
    if (kgEl) kgEl.textContent = totalKg.toLocaleString() + " kg";
    if (co2El) co2El.textContent = parseInt(co2Saved).toLocaleString() + " kg";
    if (waterEl) waterEl.textContent = waterSaved + " kL";
    if (activeEl) activeEl.textContent = active.length;
  },

  /**
   * Dynamic Chart.js Analytics initialization
   */
  initAnalyticsChart() {
    const ctx = document.getElementById("impact-chart");
    if (!ctx || typeof Chart === "undefined") return;

    new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            label: "Meals Rescued",
            data: [420, 580, 710, 640, 890, 1120, 940],
            backgroundColor: "#10b981",
            borderRadius: 6
          },
          {
            label: "CO₂ Mitigated (kg)",
            data: [180, 240, 310, 270, 390, 480, 410],
            backgroundColor: "#f59e0b",
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#94a3b8", font: { family: "Inter" } }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#94a3b8" }
          },
          y: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#94a3b8" }
          }
        }
      }
    });
  },

  renderDonorSelectOptions() {
    // Populate donor quick-fill presets
    const select = document.getElementById("donor-preset-select");
    if (!select) return;

    select.innerHTML = `<option value="">-- Or pick a registered donor profile --</option>` +
      this.data.donors.map(d => `
        <option value="${d.id}">${d.name} (${d.category})</option>
      `).join('');
  },

  fillDonorPreset(donorId) {
    const donor = this.data.donors.find(d => d.id === donorId);
    if (!donor) return;

    const form = document.getElementById("donor-form");
    if (!form) return;

    form.donorName.value = donor.name;
    form.donorCategory.value = donor.category;
    form.pickupAddress.value = donor.address;
  },

  setFilter(category) {
    this.data.selectedFilter = category;
    document.querySelectorAll(".filter-chip").forEach(chip => {
      chip.classList.toggle("active", chip.dataset.category === category);
    });
    this.renderFoodQueue();
  },

  setSort(sortMode) {
    this.data.selectedSort = sortMode;
    const select = document.getElementById("sort-by-select");
    if (select) select.value = sortMode;
    this.renderFoodQueue();
  },

  resetFilters() {
    this.data.selectedFilter = "all";
    this.data.selectedSort = "smart";
    this.data.searchQuery = "";
    const searchInput = document.getElementById("search-input");
    if (searchInput) searchInput.value = "";
    document.querySelectorAll(".filter-chip").forEach(chip => {
      chip.classList.toggle("active", chip.dataset.category === "all");
    });
    this.renderFoodQueue();
  },

  switchTab(tabName) {
    document.querySelectorAll(".nav-tab").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.tab === tabName);
    });
    document.querySelectorAll(".view-section").forEach(sec => {
      sec.classList.toggle("active", sec.id === `view-${tabName}`);
    });

    if (tabName === "map" && window.MapRadar && window.MapRadar.map) {
      setTimeout(() => {
        window.MapRadar.map.invalidateSize();
      }, 200);
    }
  },

  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-message toast-${type}`;
    
    let icon = "fa-info-circle";
    if (type === "success") icon = "fa-circle-check";
    if (type === "error") icon = "fa-circle-xmark";
    if (type === "warning") icon = "fa-triangle-exclamation";

    toast.innerHTML = `
      <i class="fas ${icon}"></i>
      <span>${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  },

  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.data.searchQuery = e.target.value;
        this.renderFoodQueue();
      });
    }

    // Sort select
    const sortSelect = document.getElementById("sort-by-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        this.setSort(e.target.value);
      });
    }

    // NGO Dropdown Change
    const ngoDropdown = document.getElementById("active-ngo-dropdown");
    if (ngoDropdown) {
      ngoDropdown.addEventListener("change", (e) => {
        this.setActiveNgo(e.target.value);
      });
    }

    // Donor Form Submission
    const donorForm = document.getElementById("donor-form");
    if (donorForm) {
      donorForm.addEventListener("submit", (e) => this.handleDonorSubmit(e));
    }

    // Tab Navigation
    document.querySelectorAll(".nav-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        this.switchTab(tab.dataset.tab);
      });
    });

    // Category Filter Chips
    document.querySelectorAll(".filter-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        this.setFilter(chip.dataset.category);
      });
    });

    // Status Tab Buttons
    document.querySelectorAll(".status-tab-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".status-tab-btn").forEach(b => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        this.renderFoodQueue();
      });
    });

    // Preset selector
    const presetSelect = document.getElementById("donor-preset-select");
    if (presetSelect) {
      presetSelect.addEventListener("change", (e) => {
        this.fillDonorPreset(e.target.value);
      });
    }
  }
};

window.AppState = AppState;

document.addEventListener("DOMContentLoaded", () => {
  AppState.init();
});
