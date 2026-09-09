/**
 * NourishNet - Smart Prioritization Algorithm
 * Computes multi-factor priority scores based on:
 * 1. Proximity Distance (Haversine formula in km)
 * 2. Expiry Urgency (Dynamic time decay function)
 * 3. Food Quantity & Capacity match (Servings / KG)
 */

const PriorityEngine = {
  // Configurable weights (sum to 1.0)
  WEIGHTS: {
    urgency: 0.45,   // 45% weight on remaining shelf life
    distance: 0.35,  // 35% weight on proximity distance
    quantity: 0.20   // 20% weight on total servings rescued
  },

  /**
   * Calculate distance between two GPS coordinates using Haversine Formula
   * @param {number} lat1 
   * @param {number} lon1 
   * @param {number} lat2 
   * @param {number} lon2 
   * @returns {number} distance in kilometers (rounded to 1 decimal)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 3.5; // fallback default
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return Math.round(d * 10) / 10;
  },

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  },

  /**
   * Calculate remaining minutes until food expires
   * @param {string|Date} expiryTime 
   * @returns {number} remaining minutes (can be negative if expired)
   */
  getRemainingMinutes(expiryTime) {
    const now = new Date();
    const expiry = new Date(expiryTime);
    const diffMs = expiry.getTime() - now.getTime();
    return Math.round(diffMs / 60000);
  },

  /**
   * Urgency Score: 0 to 100
   * - < 45 mins: 90 - 100 (Critical SOS)
   * - 45 - 90 mins: 75 - 90 (High Urgency)
   * - 90 - 180 mins: 50 - 75 (Moderate)
   * - > 180 mins: scaled down smoothly
   */
  computeUrgencyScore(remainingMinutes) {
    if (remainingMinutes <= 0) return 100; // Expiring right now
    if (remainingMinutes <= 30) return 98;
    if (remainingMinutes <= 60) {
      // 30 to 60 mins -> 85 to 98
      return Math.round(98 - ((remainingMinutes - 30) / 30) * 13);
    }
    if (remainingMinutes <= 120) {
      // 60 to 120 mins -> 70 to 85
      return Math.round(85 - ((remainingMinutes - 60) / 60) * 15);
    }
    if (remainingMinutes <= 360) {
      // 120 to 360 mins -> 35 to 70
      return Math.round(70 - ((remainingMinutes - 120) / 240) * 35);
    }
    // > 6 hours
    return Math.max(10, Math.round(35 - ((remainingMinutes - 360) / 720) * 25));
  },

  /**
   * Distance Score: 0 to 100 (Higher is closer / better)
   * Assume 20km is city radius threshold
   */
  computeDistanceScore(distanceKm, maxRadius = 15) {
    if (distanceKm <= 0.5) return 100;
    if (distanceKm >= maxRadius) return 10;
    // Linear decay from 100 at 0km to 10 at maxRadius
    return Math.round(100 - (distanceKm / maxRadius) * 90);
  },

  /**
   * Quantity Score: 0 to 100 (Higher servings = greater impact)
   */
  computeQuantityScore(servings) {
    if (!servings || servings <= 10) return 20;
    if (servings >= 300) return 100;
    return Math.round(Math.min(100, 20 + (servings / 300) * 80));
  },

  /**
   * Composite Priority Calculation
   * @param {Object} foodListing 
   * @param {Object} currentNgo 
   * @returns {Object} detailed score breakdown and priority tier
   */
  evaluatePriority(foodListing, currentNgo) {
    const remainingMinutes = this.getRemainingMinutes(foodListing.expiryTime);
    const distanceKm = this.calculateDistance(
      currentNgo?.lat || 28.6139,
      currentNgo?.lng || 77.2090,
      foodListing.lat,
      foodListing.lng
    );

    const urgencyScore = this.computeUrgencyScore(remainingMinutes);
    const distanceScore = this.computeDistanceScore(distanceKm);
    const quantityScore = this.computeQuantityScore(foodListing.servings);

    // Weighted composite score (0 to 100)
    let totalScore = Math.round(
      (this.WEIGHTS.urgency * urgencyScore) +
      (this.WEIGHTS.distance * distanceScore) +
      (this.WEIGHTS.quantity * quantityScore)
    );

    // Safety boost: if remaining time is under 45 mins, force high urgency boost
    if (remainingMinutes > 0 && remainingMinutes <= 45 && totalScore < 85) {
      totalScore = Math.min(100, totalScore + 12);
    }

    let tier = "normal";
    let tierLabel = "Normal Priority";
    let tierIcon = "fa-clock";
    let badgeClass = "badge-normal";

    if (totalScore >= 78 || (remainingMinutes <= 60 && remainingMinutes > 0)) {
      tier = "critical";
      tierLabel = "🚨 URGENT SOS";
      tierIcon = "fa-fire";
      badgeClass = "badge-urgent";
    } else if (totalScore >= 55) {
      tier = "high";
      tierLabel = "⚡ High Priority";
      tierIcon = "fa-bolt";
      badgeClass = "badge-high";
    }

    return {
      totalScore,
      tier,
      tierLabel,
      tierIcon,
      badgeClass,
      distanceKm,
      remainingMinutes,
      isExpired: remainingMinutes <= 0,
      breakdown: {
        urgencyScore,
        distanceScore,
        quantityScore,
        weights: this.WEIGHTS
      }
    };
  },

  /**
   * Sort array of food listings by selected strategy
   */
  sortListings(listings, currentNgo, sortBy = "smart") {
    // First calculate priority for each listing
    const evaluated = listings.map(item => {
      const evaluation = this.evaluatePriority(item, currentNgo);
      return { ...item, evaluation };
    });

    switch (sortBy) {
      case "urgency":
        return evaluated.sort((a, b) => a.evaluation.remainingMinutes - b.evaluation.remainingMinutes);
      case "distance":
        return evaluated.sort((a, b) => a.evaluation.distanceKm - b.evaluation.distanceKm);
      case "quantity":
        return evaluated.sort((a, b) => b.servings - a.servings);
      case "smart":
      default:
        // Highest priority score first
        return evaluated.sort((a, b) => b.evaluation.totalScore - a.evaluation.totalScore);
    }
  },

  /**
   * Format remaining time into clean human-readable countdown string
   */
  formatCountdown(remainingMinutes) {
    if (remainingMinutes <= 0) return "Expired";
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;
    if (hours === 0) return `${mins}m left`;
    return `${hours}h ${mins}m left`;
  }
};

window.PriorityEngine = PriorityEngine;
