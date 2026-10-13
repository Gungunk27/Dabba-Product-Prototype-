/**
 * Validation utilities for orders, customer details, and provider inputs.
 */

export interface CheckoutFormInput {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  locality: string;
  landmark?: string;
  deliverySlot: 'lunch' | 'dinner';
  paymentMethod: 'cod' | 'upi_on_delivery';
  orderNotes?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateCheckoutForm(data: CheckoutFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.customerName || data.customerName.trim().length < 2) {
    errors.customerName = 'Please enter your full name (minimum 2 letters).';
  }

  // Indian phone validation (10 digits, optional +91 prefix)
  const phoneClean = data.customerPhone.replace(/[\s-]/g, '');
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
  if (!phoneClean) {
    errors.customerPhone = 'Contact phone number is required.';
  } else if (!phoneRegex.test(phoneClean)) {
    errors.customerPhone = 'Enter a valid 10-digit mobile number (e.g. 9845012345).';
  }

  if (!data.deliveryAddress || data.deliveryAddress.trim().length < 8) {
    errors.deliveryAddress = 'Please specify house/flat number, building, and street name.';
  }

  if (!data.locality || data.locality.trim().length < 2) {
    errors.locality = 'Please select or enter your delivery locality / area.';
  }

  if (!data.deliverySlot) {
    errors.deliverySlot = 'Please select lunch or dinner delivery slot.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateMealUpdate(sabziName: string): { isValid: boolean; error?: string } {
  if (!sabziName || sabziName.trim().length < 3) {
    return {
      isValid: false,
      error: 'Dish name must be at least 3 characters long.'
    };
  }
  return { isValid: true };
}
