import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import { TiffinService } from '../services/tiffinService';
import { useCart } from '../context/CartContext';
import { CheckCircle2, Clock, MapPin, ArrowRight, ShieldCheck, Phone } from 'lucide-react';

interface OrderConfirmationViewProps {
  orderId: string;
}

export const OrderConfirmationView: React.FC<OrderConfirmationViewProps> = ({ orderId }) => {
  const { navigate } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      setIsLoading(true);
      try {
        const found = await TiffinService.getOrderById(orderId);
        setOrder(found);
      } finally {
        setIsLoading(false);
      }
    }
    loadOrder();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center animate-pulse space-y-4">
        <div className="w-16 h-16 bg-stone-200 rounded-full mx-auto" />
        <div className="h-6 w-48 bg-stone-200 rounded mx-auto" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-stone-900">Order not found</h2>
        <button
          onClick={() => navigate({ name: 'home' })}
          className="px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      {/* 1. Header confirmation banner */}
      <div className="text-center space-y-3 bg-white rounded-2xl border border-stone-200 p-8 shadow-xs">
        <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-900 uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Status: {order.status.toUpperCase()} · TEST ORDER
        </div>

        <h1 className="text-2xl font-extrabold text-stone-900">
          Test Order Request Submitted!
        </h1>

        <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
          Order reference <strong className="text-stone-900 font-mono text-sm">{order.id}</strong> has been logged in <strong className="text-amber-800">Requested</strong> status.
        </p>

        {/* Clear workflow disclosures */}
        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-[11px] text-stone-600 max-w-md mx-auto text-left space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-stone-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>Test-Order Workflow Invariants Enforced:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-stone-600">
            <li><strong>Zero Money Charged:</strong> No payment provider was contacted.</li>
            <li><strong>Starts in Requested Status:</strong> Awaiting home-kitchen acceptance.</li>
            <li><strong>No Guaranteed Delivery:</strong> Slot is requested, not guaranteed.</li>
          </ul>
        </div>

        {/* Live status bar */}
        <div className="pt-4 max-w-md mx-auto">
          <div className="grid grid-cols-4 text-center text-[10px] sm:text-[11px] gap-1">
            <div className={`font-bold ${order.status === 'requested' ? 'text-amber-700 font-extrabold' : 'text-stone-500'}`}>
              1. Requested
            </div>
            <div className={`font-semibold ${order.status === 'confirmed' ? 'text-amber-700 font-bold' : 'text-stone-400'}`}>
              2. Confirmed
            </div>
            <div className={`font-semibold ${order.status === 'preparing' ? 'text-amber-700 font-bold' : 'text-stone-400'}`}>
              3. Preparing
            </div>
            <div className={`font-semibold ${order.status === 'dispatched' ? 'text-emerald-700 font-bold' : 'text-stone-400'}`}>
              4. Dispatched
            </div>
          </div>
          <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                order.status === 'cancelled'
                  ? 'bg-rose-500 w-full'
                  : order.status === 'requested'
                  ? 'bg-amber-500 w-1/4'
                  : order.status === 'confirmed'
                  ? 'bg-amber-600 w-2/4'
                  : order.status === 'preparing'
                  ? 'bg-amber-700 w-3/4'
                  : 'bg-emerald-600 w-full'
              }`}
            />
          </div>
        </div>
      </div>

      {/* 2. Delivery & Schedule Details */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
          Delivery Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-stone-500 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Estimated Delivery Time
            </span>
            <p className="text-sm font-bold text-stone-900">
              {order.estimatedDeliveryTime} ({order.deliverySlot === 'lunch' ? 'Lunch Slot' : 'Dinner Slot'})
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-stone-500 font-medium flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Deliver To
            </span>
            <p className="font-bold text-stone-900">{order.customerName} ({order.customerPhone})</p>
            <p className="text-stone-600">{order.deliveryAddress}, {order.locality}</p>
          </div>
        </div>

        {order.orderNotes && (
          <div className="p-3 bg-stone-50 rounded-lg text-stone-600">
            <strong>Delivery Note:</strong> {order.orderNotes}
          </div>
        )}
      </div>

      {/* 3. Itemized Receipt */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 text-xs">
        <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
          Itemized Dabba Plan
        </h2>

        <div className="divide-y divide-stone-100">
          {order.items.map(item => (
            <div key={item.cartItemId} className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-bold text-stone-900">{item.meal.title}</span>
                <span className="block text-[11px] text-stone-500">
                  Qty: {item.quantity} · {item.frequency === 'single_trial' ? 'Single Trial' : item.frequency === 'weekly_6days' ? '6-Day Weekly' : '24-Day Monthly'}
                </span>
              </div>
              <span className="font-bold text-stone-900 tabular-nums">₹{item.totalPrice}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-stone-200 space-y-1.5 text-stone-600">
          <div className="flex justify-between">
            <span>Meal Subtotal</span>
            <span className="tabular-nums font-medium text-stone-900">₹{order.subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span>Dabba Packaging Deposit</span>
            <span className="tabular-nums font-medium text-stone-900">₹{order.packagingFee.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery Charge</span>
            <span className="text-emerald-700 font-medium">
              {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee.toLocaleString('en-IN')}`}
            </span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Trial Discount</span>
              <span className="tabular-nums">-₹{order.discount.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="pt-2 border-t border-stone-100 flex justify-between font-bold text-stone-900 text-sm">
            <span>Amount Payable ({order.paymentMethod === 'upi_on_delivery' ? 'UPI on Delivery' : 'Cash on Delivery'})</span>
            <span className="tabular-nums text-base">₹{order.finalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* 4. Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate({ name: 'home' })}
          className="flex-1 py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition-colors text-center"
        >
          Return to Marketplace
        </button>
        <button
          onClick={() => navigate({ name: 'provider-dashboard' })}
          className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition-colors text-center"
        >
          View in Kitchen Portal
        </button>
      </div>
    </div>
  );
};
