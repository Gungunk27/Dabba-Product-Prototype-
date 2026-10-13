import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { TiffinService } from '../services/tiffinService';
import { CheckoutFormInput, validateCheckoutForm } from '../services/validation';
import { ArrowLeft, Trash2, ShieldCheck, MapPin, CheckCircle, Clock } from 'lucide-react';

export const CheckoutView: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, clearCart, navigate } = useCart();

  const [formData, setFormData] = useState<CheckoutFormInput>({
    customerName: 'Aarav Sharma',
    customerPhone: '9845012345',
    deliveryAddress: 'Flat 304, Palm Grove Apartments, 7th Cross, Indiranagar',
    locality: 'Indiranagar',
    landmark: 'Opposite Metro Pillar 104',
    deliverySlot: 'lunch',
    paymentMethod: 'upi_on_delivery',
    orderNotes: 'Please ring the doorbell once and leave with security if unavailable.',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const pricing = TiffinService.calculateOrderPricing(cart);

  const handleFillTestAddress = () => {
    setFormData({
      customerName: 'Aarav Sharma (Test Customer)',
      customerPhone: '9845012345',
      deliveryAddress: '[TEST ADDRESS] Flat 402, Palm Grove Demo Tower, 100 Feet Road',
      locality: 'Indiranagar',
      landmark: '[TEST] Opp Metro Pillar 104',
      deliverySlot: 'lunch',
      paymentMethod: 'upi_on_delivery',
      orderNotes: '[TEST ORDER] Automated workflow verification order — do not dispatch actual meal.',
    });
    setFormErrors({});
    setSubmitError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent accidental duplicate clicks
    setSubmitError(null);

    const validation = validateCheckoutForm(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    if (cart.length === 0) {
      setSubmitError('Your dabba bag is empty. Please add a meal first.');
      return;
    }

    setIsSubmitting(true);
    const idempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    try {
      const createdOrder = await TiffinService.createOrder(formData, cart, idempotencyKey);
      clearCart();
      navigate({ name: 'order-confirmation', orderId: createdOrder.id });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to place test order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-stone-900">Your Dabba Bag is Empty</h2>
        <p className="text-xs text-stone-500 max-w-sm mx-auto">
          Explore delicious everyday thalis, Gujarati dabbas, or Jain sattvic boxes to place your order.
        </p>
        <button
          onClick={() => navigate({ name: 'home' })}
          className="mt-2 px-5 py-2.5 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 transition-colors"
        >
          Browse Fresh Tiffins
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigate({ name: 'home' })}
        className="text-xs text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1.5"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Continue Browsing
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form details */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Delivery Details Section */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-stone-100">
                <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-700" />
                  Delivery Address & Contact
                </h2>
                <button
                  type="button"
                  onClick={handleFillTestAddress}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors border border-amber-300 self-start sm:self-auto"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Fill Clearly Marked Test Address
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="customerName" className="text-xs font-medium text-stone-700 block mb-1">
                    Your Full Name *
                  </label>
                  <input
                    id="customerName"
                    name="customerName"
                    type="text"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {formErrors.customerName && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.customerName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="customerPhone" className="text-xs font-medium text-stone-700 block mb-1">
                    Mobile Number (10 digits) *
                  </label>
                  <input
                    id="customerPhone"
                    name="customerPhone"
                    type="tel"
                    value={formData.customerPhone}
                    onChange={handleInputChange}
                    placeholder="9845012345"
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {formErrors.customerPhone && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.customerPhone}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="deliveryAddress" className="text-xs font-medium text-stone-700 block mb-1">
                  Complete Delivery Address *
                </label>
                <textarea
                  id="deliveryAddress"
                  name="deliveryAddress"
                  rows={2}
                  value={formData.deliveryAddress}
                  onChange={handleInputChange}
                  placeholder="House/Flat number, apartment or office building, street"
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {formErrors.deliveryAddress && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.deliveryAddress}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="locality" className="text-xs font-medium text-stone-700 block mb-1">
                    Locality / Area *
                  </label>
                  <input
                    id="locality"
                    name="locality"
                    type="text"
                    value={formData.locality}
                    onChange={handleInputChange}
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {formErrors.locality && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.locality}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="landmark" className="text-xs font-medium text-stone-700 block mb-1">
                    Landmark (Optional)
                  </label>
                  <input
                    id="landmark"
                    name="landmark"
                    type="text"
                    value={formData.landmark}
                    onChange={handleInputChange}
                    placeholder="e.g. Near metro station, behind temple"
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Delivery Time Window */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-700" />
                Delivery Slot Time
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <label className={`p-3 rounded-xl border cursor-pointer text-left transition-all ${
                  formData.deliverySlot === 'lunch'
                    ? 'border-amber-600 bg-amber-50/50 ring-1 ring-amber-600'
                    : 'border-stone-200 hover:border-stone-300'
                }`}>
                  <input
                    type="radio"
                    name="deliverySlot"
                    value="lunch"
                    checked={formData.deliverySlot === 'lunch'}
                    onChange={() => setFormData(p => ({ ...p, deliverySlot: 'lunch' }))}
                    className="sr-only"
                  />
                  <span className="text-xs font-bold text-stone-900 block">Lunch Slot</span>
                  <span className="text-[11px] text-stone-500">12:15 PM – 1:15 PM</span>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer text-left transition-all ${
                  formData.deliverySlot === 'dinner'
                    ? 'border-amber-600 bg-amber-50/50 ring-1 ring-amber-600'
                    : 'border-stone-200 hover:border-stone-300'
                }`}>
                  <input
                    type="radio"
                    name="deliverySlot"
                    value="dinner"
                    checked={formData.deliverySlot === 'dinner'}
                    onChange={() => setFormData(p => ({ ...p, deliverySlot: 'dinner' }))}
                    className="sr-only"
                  />
                  <span className="text-xs font-bold text-stone-900 block">Dinner Slot</span>
                  <span className="text-[11px] text-stone-500">7:45 PM – 8:45 PM</span>
                </label>
              </div>

              <div>
                <label htmlFor="orderNotes" className="text-xs font-medium text-stone-700 block mb-1">
                  Delivery instructions / Gate pass note
                </label>
                <input
                  id="orderNotes"
                  name="orderNotes"
                  type="text"
                  value={formData.orderNotes}
                  onChange={handleInputChange}
                  placeholder="e.g. Ring twice, leave with security guard, no horn"
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* 3. Demo Payment Selection */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700" />
                Payment Method (Pay On Delivery)
              </h2>

              <p className="text-xs text-stone-500">
                To keep tiffin subscriptions accessible, you pay only once the dabba arrives at your door.
              </p>

              <div className="space-y-2">
                <label className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between ${
                  formData.paymentMethod === 'upi_on_delivery'
                    ? 'border-amber-600 bg-amber-50/50 ring-1 ring-amber-600'
                    : 'border-stone-200 hover:border-stone-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="upi_on_delivery"
                      checked={formData.paymentMethod === 'upi_on_delivery'}
                      onChange={() => setFormData(p => ({ ...p, paymentMethod: 'upi_on_delivery' }))}
                    />
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">UPI on Delivery</span>
                      <span className="text-[11px] text-stone-500">Scan QR code on the thermal dabba pack</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700">Recommended</span>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between ${
                  formData.paymentMethod === 'cod'
                    ? 'border-amber-600 bg-amber-50/50 ring-1 ring-amber-600'
                    : 'border-stone-200 hover:border-stone-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={formData.paymentMethod === 'cod'}
                      onChange={() => setFormData(p => ({ ...p, paymentMethod: 'cod' }))}
                    />
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">Cash on Delivery</span>
                      <span className="text-[11px] text-stone-500">Hand cash to the delivery executive</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Test Order Notice */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Test-Order Workflow Guarantee</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Orders are submitted to the backend and start in <strong>Requested</strong> status awaiting home-kitchen acceptance. No payment gateway is called, zero money is charged, and no deliveries are promised.
              </p>
            </div>

            {submitError && (
              <div role="alert" className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                <span className="font-bold text-rose-700">Error:</span>
                <span>{submitError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Test Order...</span>
                </>
              ) : (
                <span>Submit Test Order · ₹{pricing.finalAmount.toLocaleString('en-IN')}</span>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Order Summary Drawer / Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
            <h2 className="text-base font-bold text-stone-900">
              Dabba Bag Summary ({cart.length} {cart.length === 1 ? 'item' : 'items'})
            </h2>

            {/* Itemized List */}
            <div className="divide-y divide-stone-100">
              {cart.map(item => (
                <div key={item.cartItemId} className="py-3 flex items-start gap-3 text-xs">
                  <img
                    src={item.meal.imageUrl}
                    alt={item.meal.title}
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-stone-900 truncate">{item.meal.title}</h3>
                    <p className="text-[11px] text-stone-500">
                      {item.frequency === 'single_trial'
                        ? '1-Day Trial'
                        : item.frequency === 'weekly_6days'
                        ? '6-Day Weekly Plan'
                        : '24-Day Monthly Plan'}{' '}
                      · {item.selectedSlot === 'lunch' ? 'Lunch' : 'Dinner'}
                    </p>

                    {/* Quantity modifier */}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-stone-200 rounded">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                          className="px-2 py-0.5 bg-stone-50 text-stone-700 hover:bg-stone-100 font-bold"
                        >
                          -
                        </button>
                        <span className="px-2 font-bold tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                          className="px-2 py-0.5 bg-stone-50 text-stone-700 hover:bg-stone-100 font-bold"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.cartItemId)}
                        className="text-stone-400 hover:text-rose-600 transition-colors"
                        title="Remove meal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <span className="font-bold text-stone-900 tabular-nums">
                    ₹{item.totalPrice.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="pt-3 border-t border-stone-100 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Meal Subtotal</span>
                <span className="tabular-nums font-medium text-stone-900">₹{pricing.subtotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-stone-600">
                <span>Delivery Charge</span>
                <span className="tabular-nums">
                  {pricing.deliveryFee === 0 ? (
                    <strong className="text-emerald-700 font-semibold">FREE (Waived for plan/order)</strong>
                  ) : (
                    `₹${pricing.deliveryFee.toLocaleString('en-IN')}`
                  )}
                </span>
              </div>

              <div className="flex justify-between text-stone-600">
                <span>Stainless Dabba Deposit</span>
                <span className="tabular-nums font-medium text-stone-900">₹{pricing.packagingFee.toLocaleString('en-IN')}</span>
              </div>

              {pricing.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Welcome Trial Discount</span>
                  <span className="tabular-nums">-₹{pricing.discount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="pt-3 border-t border-stone-200 flex justify-between items-baseline text-sm font-extrabold text-stone-900">
                <span>Total Payable</span>
                <span className="text-xl tabular-nums">₹{pricing.finalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Commitment:</strong> Pause subscription days anytime or cancel with unused balance refunded.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
