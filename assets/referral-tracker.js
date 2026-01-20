/**
 * Referral Tracking System
 *
 * Tracks referral sources via URL parameter (?ref=store-name) and stores
 * the referral information as a cart attribute visible in Shopify admin orders.
 *
 * Features:
 * - Reads ?ref= query parameter from URL
 * - Persists referral in localStorage across sessions
 * - Automatically adds referral as cart attribute when items are added
 * - Referral data appears in order admin under "Additional Details"
 */

const REFERRAL_PARAM = 'ref';
const STORAGE_KEY = 'shared_sweeps_referral_tracker';
const CART_ATTRIBUTE_KEY = 'Shared_Sweeps_Referred_By';

/**
 * ReferralTracker class handles all referral tracking functionality
 */
class ReferralTracker {
  constructor() {
    this.init();
  }

  /**
   * Initialize the referral tracker
   */
  init() {
    // Check URL for referral parameter on page load
    this.captureReferralFromURL();

    // Listen for cart add events to attach referral data
    this.setupCartListener();

    // Also sync referral to cart on page load if we have one stored
    this.syncReferralToCart();
  }

  /**
   * Capture referral code from URL query parameter
   */
  captureReferralFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const referral = urlParams.get(REFERRAL_PARAM);

    if (referral) {
      this.storeReferral(referral);
      console.log(`[Shared Sweeps ReferralTracker] Captured referral: ${referral}`);
    }
  }

  /**
   * Store referral in localStorage
   * @param {string} referral - The referral code to store
   */
  storeReferral(referral) {
    try {
      const data = {
        code: referral,
        capturedAt: new Date().toISOString(),
        landingPage: window.location.pathname
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[ReferralTracker] Failed to store referral:', error);
    }
  }

  /**
   * Get stored referral data
   * @returns {Object|null} The stored referral data or null
   */
  getStoredReferral() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('[ReferralTracker] Failed to retrieve referral:', error);
      return null;
    }
  }

  /**
   * Setup listener for cart add events
   */
  setupCartListener() {
    // Listen for the theme's cart:update event (used by both CartAddEvent and CartUpdateEvent)
    document.addEventListener('cart:update', () => {
      this.syncReferralToCart();
    });
  }

  /**
   * Sync referral data to cart attributes
   */
  async syncReferralToCart() {
    const referralData = this.getStoredReferral();

    if (!referralData || !referralData.code) {
      return;
    }

    try {
      // First, check current cart attributes to avoid unnecessary updates
      const cartResponse = await fetch('/cart.js');
      const cart = await cartResponse.json();

      // Only update if the referral isn't already set
      if (cart.attributes && cart.attributes[CART_ATTRIBUTE_KEY] === referralData.code) {
        return;
      }

      // Update cart attributes with referral information
      const response = await fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attributes: {
            [CART_ATTRIBUTE_KEY]: referralData.code,
            'Shared_Sweeps_Referral_Landing_Page': referralData.landingPage,
            'Shared_Sweeps_Referral_Captured_At': referralData.capturedAt
          }
        })
      });

      if (response.ok) {
        console.log(`[ReferralTracker] Cart attribute updated with referral: ${referralData.code}`);
      }
    } catch (error) {
      console.error('[ReferralTracker] Failed to update cart attributes:', error);
    }
  }

  /**
   * Clear stored referral (useful after order completion)
   */
  clearReferral() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[ReferralTracker] Referral data cleared');
    } catch (error) {
      console.error('[ReferralTracker] Failed to clear referral:', error);
    }
  }

  /**
   * Get the current referral code (useful for displaying to user)
   * @returns {string|null} The referral code or null
   */
  getReferralCode() {
    const data = this.getStoredReferral();
    return data?.code || null;
  }
}

// Initialize the referral tracker when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.ReferralTracker = new ReferralTracker();
  });
} else {
  window.ReferralTracker = new ReferralTracker();
}

// Export for module usage
export { ReferralTracker, REFERRAL_PARAM, STORAGE_KEY, CART_ATTRIBUTE_KEY };
