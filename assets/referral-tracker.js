/**
 * Referral Tracking System
 *
 * Tracks referral sources via URL parameters (?ref=store-name&order_id=123) and stores
 * the referral information as cart attributes visible in Shopify admin orders.
 *
 * Features:
 * - Reads ?ref= and ?order_id= query parameters from URL
 * - Persists referral and order_id in localStorage across sessions
 * - Automatically adds referral and order_id as cart attributes when items are added
 * - Referral data appears in order admin under "Additional Details"
 */

const REFERRAL_PARAM = 'ref';
const ORDER_ID_PARAM = 'order_id';
const STORAGE_KEY = 'shared_sweeps_referral_tracker';
const CART_ATTRIBUTE_KEY = 'Shared_Sweeps_Referred_By';
const ORDER_ID_ATTRIBUTE_KEY = 'Shared_Sweeps_Order_ID';

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
    console.log('[Shared Sweeps ReferralTracker] Initializing...');
    // Check URL for referral parameter on page load
    this.captureReferralFromURL();

    // Listen for cart add events to attach referral data
    this.setupCartListener();

    // Also sync referral to cart on page load if we have one stored
    this.syncReferralToCart();
  }

  /**
   * Capture referral code and order_id from URL query parameters
   */
  captureReferralFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const referral = urlParams.get(REFERRAL_PARAM);
    const orderId = urlParams.get(ORDER_ID_PARAM);

    if (referral || orderId) {
      this.storeReferral(referral, orderId);
      if (referral) {
        console.log(`[Shared Sweeps ReferralTracker] Captured referral: ${referral}`);
      }
      if (orderId) {
        console.log(`[Shared Sweeps ReferralTracker] Captured order_id: ${orderId}`);
      }
    }
  }

  /**
   * Store referral and order_id in localStorage
   * @param {string|null} referral - The referral code to store
   * @param {string|null} orderId - The order ID to store
   */
  storeReferral(referral, orderId) {
    try {
      // Get existing data to preserve values not being updated
      const existingData = this.getStoredReferral() || {};
      const data = {
        code: referral || existingData.code || null,
        orderId: orderId || existingData.orderId || null,
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
      console.log('[Shared Sweeps ReferralTracker] Cart updated, syncing referral to cart...');
      this.syncReferralToCart();
    });
  }

  /**
   * Sync referral data to cart attributes
   */
  async syncReferralToCart() {
    const referralData = this.getStoredReferral();

    if (!referralData || (!referralData.code && !referralData.orderId)) {
      return;
    }

    try {
      // First, check current cart attributes to avoid unnecessary updates
      const cartResponse = await fetch('/cart.js');
      const cart = await cartResponse.json();

      // Check if both referral and order_id are already set correctly
      const referralMatches = !referralData.code || (cart.attributes && cart.attributes[CART_ATTRIBUTE_KEY] === referralData.code);
      const orderIdMatches = !referralData.orderId || (cart.attributes && cart.attributes[ORDER_ID_ATTRIBUTE_KEY] === referralData.orderId);

      if (referralMatches && orderIdMatches) {
        return;
      }

      // Build attributes object with available data
      const attributes = {
        'Shared_Sweeps_Referral_Landing_Page': referralData.landingPage,
        'Shared_Sweeps_Referral_Captured_At': referralData.capturedAt
      };

      if (referralData.code) {
        attributes[CART_ATTRIBUTE_KEY] = referralData.code;
      }

      if (referralData.orderId) {
        attributes[ORDER_ID_ATTRIBUTE_KEY] = referralData.orderId;
      }

      // Update cart attributes with referral information
      const response = await fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attributes })
      });

      if (response.ok) {
        if (referralData.code) {
          console.log(`[ReferralTracker] Cart attribute updated with referral: ${referralData.code}`);
        }
        if (referralData.orderId) {
          console.log(`[ReferralTracker] Cart attribute updated with order_id: ${referralData.orderId}`);
        }
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
export { ReferralTracker, REFERRAL_PARAM, ORDER_ID_PARAM, STORAGE_KEY, CART_ATTRIBUTE_KEY, ORDER_ID_ATTRIBUTE_KEY };
