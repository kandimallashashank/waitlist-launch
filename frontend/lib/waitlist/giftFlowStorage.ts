/**
 * Client session flag for the waitlist gift wizard (``intro`` | ``quiz`` | ``results``).
 * Cleared on “Find another gift” so remounting the wizard does not replay ``onSuccess`` from cache.
 */
export const WAITLIST_GIFT_FLOW_SESSION_KEY = "waitlistGiftFlow_v1";
