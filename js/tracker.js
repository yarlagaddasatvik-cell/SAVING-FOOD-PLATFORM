/**
 * NourishNet - Claim & Dispatch Tracker
 * Manages OTP verification, real-time simulated delivery lifecycle, and CSR Impact calculations
 */

const Tracker = {
  activeTrackingId: null,
  deliveryTimers: {},

  /**
   * Process a pickup claim by an NGO
   */
  claimPickup(listingId, ngoId, volunteerName = "Rider Aman (Hero Splendor)") {
    const listing = AppState.getFoodListings().find(l => l.id === listingId);
    const ngo = AppState.getNgos().find(n => n.id === ngoId);

    if (!listing || !ngo) {
      AppState.showToast("Could not find matching record.", "error");
      return false;
    }

    if (listing.status !== "available") {
      AppState.showToast("This surplus food batch has already been claimed!", "warning");
      return false;
    }

    // Update listing status
    listing.status = "claimed";
    listing.claimedBy = {
      ngoId: ngo.id,
      ngoName: ngo.name,
      volunteerName: volunteerName,
      claimedAt: new Date().toISOString(),
      step: 1, // 1: Claimed & Assigned, 2: Out for Pickup, 3: Food Collected, 4: Distributed
      etaMinutes: 25
    };

    AppState.saveData();
    AppState.renderAll();
    AppState.showToast(`🎉 Batch successfully claimed by ${ngo.name}! Delivery OTP: ${listing.verificationOtp}`, "success");

    // Open tracking modal immediately
    this.openTrackingModal(listing.id);
    return true;
  },

  /**
   * Advance delivery stage (Step 1 -> 2 -> 3 -> 4)
   */
  advanceStage(listingId, enteredOtp = "") {
    const listing = AppState.getFoodListings().find(l => l.id === listingId);
    if (!listing || !listing.claimedBy) return;

    const currentStep = listing.claimedBy.step;

    if (currentStep === 1) {
      // Move to En Route
      listing.claimedBy.step = 2;
      listing.claimedBy.etaMinutes = 12;
      AppState.showToast("🚗 Volunteer is now en route to Donor location!", "info");
    } else if (currentStep === 2) {
      // Requires OTP Verification at Donor location
      if (enteredOtp.trim() !== listing.verificationOtp) {
        AppState.showToast("❌ Invalid OTP! Please check with the food donor.", "error");
        return false;
      }
      listing.claimedBy.step = 3;
      listing.status = "collected";
      listing.claimedBy.collectedAt = new Date().toISOString();
      listing.claimedBy.etaMinutes = 15;
      AppState.showToast("✅ OTP Verified! Food safely collected from donor. Heading to shelter.", "success");
    } else if (currentStep === 3) {
      // Completed distribution
      listing.claimedBy.step = 4;
      listing.status = "delivered";
      listing.claimedBy.deliveredAt = new Date().toISOString();
      listing.claimedBy.etaMinutes = 0;
      AppState.showToast("🌟 Food distributed to shelter! Impact metrics recorded.", "success");
    }

    AppState.saveData();
    AppState.renderAll();
    this.renderTrackingModal(listingId);
    return true;
  },

  /**
   * Open tracking modal for a specific batch
   */
  openTrackingModal(listingId) {
    this.activeTrackingId = listingId;
    const modal = document.getElementById("tracking-modal");
    if (modal) {
      modal.classList.add("active");
      this.renderTrackingModal(listingId);
    }
  },

  closeTrackingModal() {
    this.activeTrackingId = null;
    const modal = document.getElementById("tracking-modal");
    if (modal) {
      modal.classList.remove("active");
    }
  },

  /**
   * Render modal HTML content for the active tracking flow
   */
  renderTrackingModal(listingId) {
    const listing = AppState.getFoodListings().find(l => l.id === listingId);
    const container = document.getElementById("tracking-modal-content");
    if (!listing || !container) return;

    const claim = listing.claimedBy || { step: 1, volunteerName: "Assigned Volunteer", etaMinutes: 20 };
    const step = claim.step || 1;

    const step1Class = step >= 1 ? "completed active" : "";
    const step2Class = step >= 2 ? "completed active" : "";
    const step3Class = step >= 3 ? "completed active" : "";
    const step4Class = step >= 4 ? "completed active" : "";

    container.innerHTML = `
      <div class="tracking-sheet">
        <div class="tracking-top">
          <div class="tracking-title-box">
            <span class="badge ${listing.status === 'delivered' ? 'badge-normal' : 'badge-urgent'}">
              ${listing.status.toUpperCase()}
            </span>
            <h3>${listing.title}</h3>
            <p class="donor-sub"><i class="fas fa-store"></i> ${listing.donorName} &rarr; <i class="fas fa-hand-holding-heart"></i> ${claim.ngoName || 'Verified NGO'}</p>
          </div>
          <div class="otp-pill">
            <span class="otp-label">Donor Handover OTP</span>
            <span class="otp-code">${listing.verificationOtp}</span>
          </div>
        </div>

        <!-- 4-Step Progress Stepper -->
        <div class="stepper-wrapper">
          <div class="stepper-item ${step1Class}">
            <div class="step-circle"><i class="fas fa-check"></i></div>
            <div class="step-label">1. Claimed</div>
          </div>
          <div class="stepper-line ${step >= 2 ? 'filled' : ''}"></div>
          <div class="stepper-item ${step2Class}">
            <div class="step-circle"><i class="fas fa-motorcycle"></i></div>
            <div class="step-label">2. En Route</div>
          </div>
          <div class="stepper-line ${step >= 3 ? 'filled' : ''}"></div>
          <div class="stepper-item ${step3Class}">
            <div class="step-circle"><i class="fas fa-box-check"></i></div>
            <div class="step-label">3. Collected</div>
          </div>
          <div class="stepper-line ${step >= 4 ? 'filled' : ''}"></div>
          <div class="stepper-item ${step4Class}">
            <div class="step-circle"><i class="fas fa-heart-circle-check"></i></div>
            <div class="step-label">4. Distributed</div>
          </div>
        </div>

        <!-- Real-time Status Card -->
        <div class="transit-info-card">
          <div class="transit-row">
            <div>
              <small>Assigned Volunteer</small>
              <p><strong><i class="fas fa-user-shield"></i> ${claim.volunteerName}</strong></p>
            </div>
            <div>
              <small>Estimated Transit ETA</small>
              <p><strong><i class="fas fa-hourglass-half"></i> ${step === 4 ? 'Delivered' : claim.etaMinutes + ' mins'}</strong></p>
            </div>
            <div>
              <small>Rescue Quantity</small>
              <p><strong>${listing.servings} Meals (${listing.quantityKg} kg)</strong></p>
            </div>
          </div>

          <div class="pickup-address-box">
            <i class="fas fa-map-pin text-emerald"></i>
            <div>
              <strong>Pickup Location:</strong> ${listing.pickupAddress}
              <br><small class="text-muted"><i class="fas fa-notes-medical"></i> ${listing.notes}</small>
            </div>
          </div>
        </div>

        <!-- Interactive Action Step Box -->
        <div class="step-action-box">
          ${step === 1 ? `
            <div class="action-prompt">
              <p>Volunteer assigned. Ready to depart for donor pickup location?</p>
              <button class="btn btn-primary" onclick="Tracker.advanceStage('${listing.id}')">
                <i class="fas fa-route"></i> Mark En Route to Donor
              </button>
            </div>
          ` : step === 2 ? `
            <div class="action-prompt otp-action-prompt">
              <p><strong>Enter 4-Digit Handover OTP</strong> (Ask Donor Chef/Manager upon arrival):</p>
              <div class="otp-input-row">
                <input type="text" id="donor-otp-input" maxlength="4" placeholder="e.g. ${listing.verificationOtp}" class="form-input otp-field" autocomplete="off" />
                <button class="btn btn-success" onclick="Tracker.verifyAndCollect('${listing.id}')">
                  <i class="fas fa-shield-check"></i> Verify & Collect Food
                </button>
              </div>
              <small class="text-muted">Hint for simulation: The OTP is <strong class="text-emerald">${listing.verificationOtp}</strong></small>
            </div>
          ` : step === 3 ? `
            <div class="action-prompt">
              <p>Food is in transit to Shelter / Food Bank. Confirm final distribution to beneficiaries:</p>
              <button class="btn btn-success" onclick="Tracker.advanceStage('${listing.id}')">
                <i class="fas fa-heart"></i> Confirm Final Distribution
              </button>
            </div>
          ` : `
            <div class="action-prompt success-celebration">
              <h4>🎉 Rescue Mission Completed!</h4>
              <p>This batch fed <strong>${listing.servings} people</strong> and mitigated <strong>${(listing.quantityKg * 2.5).toFixed(1)} kg of CO2e</strong>.</p>
              <button class="btn btn-outline" onclick="Tracker.openCertificateModal('${listing.id}')">
                <i class="fas fa-award"></i> View Impact Certificate
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  },

  verifyAndCollect(listingId) {
    const input = document.getElementById("donor-otp-input");
    const otp = input ? input.value : "";
    this.advanceStage(listingId, otp);
  },

  /**
   * Open Certificate Modal for Donors / Rescues
   */
  openCertificateModal(listingId) {
    const listing = AppState.getFoodListings().find(l => l.id === listingId);
    if (!listing) return;

    const modal = document.getElementById("certificate-modal");
    const content = document.getElementById("certificate-content");
    if (!modal || !content) return;

    const co2Saved = (listing.quantityKg * 2.5).toFixed(1);
    const waterSaved = (listing.quantityKg * 300).toLocaleString();

    content.innerHTML = `
      <div class="certificate-paper" id="printable-certificate">
        <div class="cert-border">
          <div class="cert-header">
            <div class="cert-badge"><i class="fas fa-seedling"></i></div>
            <h2>NourishNet Certified Food Rescue</h2>
            <p class="cert-sub">Zero-Waste Sustainability & CSR Impact Recognition</p>
          </div>
          <div class="cert-body">
            <p class="cert-presented">This certificate is proudly presented to</p>
            <h3 class="cert-recipient">${listing.donorName}</h3>
            <p class="cert-desc">In grateful recognition of surplus food donation through the NourishNet Smart Redistribution Network, preventing organic landfill waste and feeding communities in need.</p>
            
            <div class="cert-stats-grid">
              <div class="cert-stat-box">
                <span class="cert-val">${listing.servings}</span>
                <span class="cert-lbl">Meals Rescued</span>
              </div>
              <div class="cert-stat-box">
                <span class="cert-val">${listing.quantityKg} kg</span>
                <span class="cert-lbl">Surplus Diverted</span>
              </div>
              <div class="cert-stat-box">
                <span class="cert-val">${co2Saved} kg</span>
                <span class="cert-lbl">CO₂ Mitigated</span>
              </div>
              <div class="cert-stat-box">
                <span class="cert-val">${waterSaved} L</span>
                <span class="cert-lbl">Water Footprint Saved</span>
              </div>
            </div>

            <div class="cert-footer">
              <div class="cert-sign">
                <strong>NourishNet Redistribution Protocol</strong>
                <span>Verified by ${listing.claimedBy?.ngoName || 'Robin Hood Army'}</span>
              </div>
              <div class="cert-date">
                <strong>Date:</strong> ${new Date(listing.claimedBy?.deliveredAt || Date.now()).toLocaleDateString()}
                <br><small>Cert ID: NN-CSR-${listing.id.toUpperCase()}</small>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="cert-actions">
        <button class="btn btn-primary" onclick="window.print()">
          <i class="fas fa-print"></i> Print / Save PDF
        </button>
        <button class="btn btn-outline" onclick="document.getElementById('certificate-modal').classList.remove('active')">
          <i class="fas fa-times"></i> Close
        </button>
      </div>
    `;

    modal.classList.add("active");
  }
};

window.Tracker = Tracker;
