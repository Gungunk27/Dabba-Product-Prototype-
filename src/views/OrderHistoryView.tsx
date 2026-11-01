import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types';
import { TiffinService } from '../services/tiffinService';
import { useCart } from '../context/CartContext';
import {
  Package,
  Clock,
  MapPin,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Search,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChefHat,
  Filter,
} from 'lucide-react';

type FilterTab = 'all' | 'active' | 'completed' | 'cancelled';

const ACTIVE_STATUSES: OrderStatus[] = ['requested', 'accepted', 'confirmed', 'preparing', 'ready', 'dispatched'];
const COMPLETED_STATUSES: OrderStatus[] = ['completed', 'delivered'];
const CANCELLED_STATUSES: OrderStatus[] = ['cancelled', 'rejected'];

export const OrderHistoryView: React.FC = () => {
  const { navigate, addToCart, showToast } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadOrders = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const fetchedOrders = await TiffinService.getCustomerOrders();
      setOrders(fetchedOrders);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load order history.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Filter orders by tab and search term
  const filteredOrders = orders.filter(order => {
    // 1. Tab filter
    if (activeTab === 'active' && !ACTIVE_STATUSES.includes(order.status)) return false;
    if (activeTab === 'completed' && !COMPLETED_STATUSES.includes(order.status)) return false;
    if (activeTab === 'cancelled' && !CANCELLED_STATUSES.includes(order.status)) return false;

    // 2. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = order.id.toLowerCase().includes(q);
      const matchCustomer = order.customerName.toLowerCase().includes(q);
      const matchAddress = order.deliveryAddress.toLowerCase().includes(q) || order.locality.toLowerCase().includes(q);
      const matchItems = order.items.some(
        item => item.meal.title.toLowerCase().includes(q) || (item.meal.providerName || '').toLowerCase().includes(q)
      );
      return matchId || matchCustomer || matchAddress || matchItems;
    }

    return true;
  });

  // Calculate metrics
  const totalCount = orders.length;
  const activeCount = orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length;
  const completedCount = orders.filter(o => COMPLETED_STATUSES.includes(o.status)).length;
  const cancelledCount = orders.filter(o => CANCELLED_STATUSES.includes(o.status)).length;

  const handleReorder = (order: Order) => {
    if (!order.items || order.items.length === 0) {
      showToast('Cannot reorder: No items in this order record.');
      return;
    }

    // Add first item back to cart
    const firstItem = order.items[0];
    addToCart(
      firstItem.meal,
      firstItem.frequency || 'single_trial',
      firstItem.selectedSlot || 'lunch',
      firstItem.quantity || 1,
      firstItem.specialInstructions
    );

    showToast(`Added ${firstItem.meal.title} back to your Dabba Bag!`);
    navigate({ name: 'checkout' });
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'requested':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-900 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Requested · Awaiting Kitchen
          </span>
        );
      case 'accepted':
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-sky-50 text-sky-900 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Accepted · Scheduled
          </span>
        );
      case 'preparing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-100 text-amber-950 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
            Preparing in Kitchen
          </span>
        );
      case 'ready':
      case 'dispatched':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            Dabba Packed & Ready
          </span>
        );
      case 'completed':
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            Delivered & Enjoyed
          </span>
        );
      case 'cancelled':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-stone-100 text-stone-700 border border-stone-200">
            <AlertCircle className="w-3.5 h-3.5 text-stone-500" />
            {status === 'rejected' ? 'Declined by Kitchen' : 'Order Cancelled'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-stone-100 text-stone-700">
            {status}
          </span>
        );
    }
  };

  const getStepProgressIndex = (status: OrderStatus): number => {
    switch (status) {
      case 'requested':
        return 0;
      case 'accepted':
      case 'confirmed':
        return 1;
      case 'preparing':
        return 2;
      case 'ready':
      case 'dispatched':
        return 3;
      case 'completed':
      case 'delivered':
        return 4;
      default:
        return -1; // cancelled/rejected
    }
  };

  const stepsList = ['Requested', 'Accepted', 'Preparing', 'Ready', 'Completed'];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* 1. Header & Navigation Context */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 tracking-wider uppercase mb-1">
              <Package className="w-4 h-4 text-amber-600" />
              <span>Customer Account</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              My Orders & Tiffin Subscriptions
            </h1>
            <p className="text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
              Track live kitchen preparation, review past daily meal plans, and quickly reorder your favorite homestyle meals.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={loadOrders}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50"
              title="Refresh order history"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => navigate({ name: 'home' })}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Order New Tiffin</span>
            </button>
          </div>
        </div>

        {/* Test Order Sandbox Disclosure Banner */}
        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Test-Order Sandbox Mode Active:</span>{' '}
              Orders shown below are authenticated simulation orders. No real credit card, UPI or bank payment has been processed, and no physical courier is dispatched.
            </div>
          </div>
          <span className="text-[11px] font-mono font-medium text-amber-900/80 bg-amber-100/70 px-2 py-0.5 rounded shrink-0 self-start sm:self-auto">
            Test Env
          </span>
        </div>
      </div>

      {/* 2. Overview Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-stone-200 p-4 rounded-xl shadow-2xs">
          <div className="text-xs text-stone-500 font-medium">Total Orders Placed</div>
          <div className="text-2xl font-extrabold text-stone-900 mt-1 tabular-nums">{totalCount}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Recorded in session</div>
        </div>
        <div className="bg-white border border-stone-200 p-4 rounded-xl shadow-2xs">
          <div className="text-xs text-stone-500 font-medium">Active & In Kitchen</div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1 tabular-nums">{activeCount}</div>
          <div className="text-[11px] text-amber-800/80 mt-0.5">Awaiting or cooking</div>
        </div>
        <div className="bg-white border border-stone-200 p-4 rounded-xl shadow-2xs">
          <div className="text-xs text-stone-500 font-medium">Completed Dabbas</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1 tabular-nums">{completedCount}</div>
          <div className="text-[11px] text-emerald-800/80 mt-0.5">Delivered safely</div>
        </div>
        <div className="bg-white border border-stone-200 p-4 rounded-xl shadow-2xs">
          <div className="text-xs text-stone-500 font-medium">Homestyle Kitchens</div>
          <div className="text-2xl font-extrabold text-stone-900 mt-1 tabular-nums">
            {new Set(orders.flatMap(o => o.items.map(i => i.meal.providerId))).size || 1}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">Verified local providers</div>
        </div>
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
        {/* Status Tabs */}
        <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-white text-stone-950 font-bold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All Orders ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'active'
                ? 'bg-white text-stone-950 font-bold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Active & In-Progress ({activeCount})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'completed'
                ? 'bg-white text-stone-950 font-bold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Completed ({completedCount})
          </button>
          {cancelledCount > 0 && (
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'cancelled'
                  ? 'bg-white text-stone-950 font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Cancelled ({cancelledCount})
            </button>
          )}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by meal, kitchen, order ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 4. Orders List or States */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-white border border-stone-200 rounded-2xl p-6 animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-5 w-36 bg-stone-200 rounded" />
                <div className="h-5 w-28 bg-stone-200 rounded" />
              </div>
              <div className="h-16 bg-stone-100 rounded-xl" />
              <div className="h-8 bg-stone-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <div className="font-bold text-rose-900 text-sm">{errorMessage}</div>
          <button
            onClick={loadOrders}
            className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-stone-900">
              {searchQuery ? 'No orders match your search' : 'No past orders found'}
            </h3>
            <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? 'Try adjusting your search query or clear the filter to view all test orders.'
                : 'Experience authentic homestyle lunch and dinner tiffins cooked with mother-level care.'}
            </p>
          </div>
          <div>
            <button
              onClick={() => navigate({ name: 'home' })}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors shadow-2xs"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span>Browse Homestyle Meals</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map(order => {
            const stepIdx = getStepProgressIndex(order.status);
            const isCancelled = CANCELLED_STATUSES.includes(order.status);
            const formattedDate = new Date(order.createdAt).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            });

            return (
              <div
                key={order.id}
                className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6 hover:border-amber-200/80 transition-colors"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-stone-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-stone-900">
                        #{order.id}
                      </span>
                      <span className="text-stone-300">·</span>
                      <span className="text-xs text-stone-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        {formattedDate}
                      </span>
                      <span className="text-stone-300">·</span>
                      <span className="text-[11px] font-semibold text-amber-900/90 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/50">
                        {order.deliverySlot === 'lunch' ? 'Lunch Slot (12:15–1:15 PM)' : 'Dinner Slot (7:45–8:45 PM)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {/* Progress Stepper (if not cancelled) */}
                {!isCancelled ? (
                  <div className="py-2">
                    <div className="relative">
                      {/* Step track bar */}
                      <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-stone-100 rounded-full" />
                      <div
                        className="absolute top-1/2 left-0 -translate-y-1/2 h-1 bg-amber-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, (stepIdx / (stepsList.length - 1)) * 100))}%`,
                        }}
                      />

                      {/* Step dots */}
                      <div className="relative flex justify-between items-center">
                        {stepsList.map((stepName, idx) => {
                          const isDone = idx < stepIdx;
                          const isCurrent = idx === stepIdx;

                          return (
                            <div key={stepName} className="flex flex-col items-center">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                                  isDone
                                    ? 'bg-amber-600 text-white'
                                    : isCurrent
                                    ? 'bg-amber-100 text-amber-900 ring-4 ring-amber-50 font-extrabold border-2 border-amber-600'
                                    : 'bg-stone-100 text-stone-400'
                                }`}
                              >
                                {isDone ? '✓' : idx + 1}
                              </div>
                              <span
                                className={`text-[10px] mt-1.5 font-medium whitespace-nowrap ${
                                  isCurrent
                                    ? 'text-amber-900 font-bold'
                                    : isDone
                                    ? 'text-stone-800'
                                    : 'text-stone-400'
                                }`}
                              >
                                {stepName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-stone-500 shrink-0" />
                    <span>This order was cancelled or declined. No charges applied.</span>
                  </div>
                )}

                {/* Ordered Items List */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Dabba Items ({order.items.length})
                  </div>
                  <div className="divide-y divide-stone-100 bg-stone-50/70 border border-stone-200/80 rounded-xl p-3 sm:p-4 space-y-3 divide-y-0">
                    {order.items.map((item, idx) => {
                      const frequencyLabel =
                        item.frequency === 'weekly_6days'
                          ? 'Weekly Plan (6 Days)'
                          : item.frequency === 'monthly_24days'
                          ? 'Monthly Plan (24 Days)'
                          : 'Single Trial Meal';

                      return (
                        <div
                          key={item.cartItemId || idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-900 text-sm">
                                {item.meal.title}
                              </span>
                              <span className="text-stone-300">·</span>
                              <span className="text-stone-600 font-medium">
                                Qty: {item.quantity}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-stone-500 flex-wrap">
                              {item.meal.providerName && (
                                <>
                                  <span className="flex items-center gap-1 font-medium text-stone-700">
                                    <ChefHat className="w-3 h-3 text-amber-700" />
                                    {item.meal.providerName}
                                  </span>
                                  <span className="text-stone-300">·</span>
                                </>
                              )}
                              <span className="font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                                {frequencyLabel}
                              </span>
                              <span className="text-stone-300">·</span>
                              <span className="text-stone-500">
                                {item.selectedSlot === 'lunch' ? 'Lunch' : 'Dinner'} Delivery
                              </span>
                            </div>

                            {item.specialInstructions && (
                              <div className="text-[11px] text-stone-500 italic">
                                Note: "{item.specialInstructions}"
                              </div>
                            )}
                          </div>

                          <div className="text-right self-end sm:self-auto font-mono font-bold text-stone-900 text-sm">
                            ₹{item.totalPrice}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery Address & Financial Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Delivery Location */}
                  <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-stone-900">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      <span>Delivery Details</span>
                    </div>
                    <div className="text-stone-700 leading-relaxed">
                      <div className="font-semibold text-stone-900">{order.customerName} · {order.customerPhone}</div>
                      <div>{order.deliveryAddress}</div>
                      {order.landmark && <div className="text-stone-500">Landmark: {order.landmark}</div>}
                      <div className="text-stone-500">Locality: {order.locality}</div>
                    </div>
                    {order.orderNotes && (
                      <div className="pt-1 text-[11px] text-amber-900/80 bg-amber-50/50 p-2 rounded border border-amber-100">
                        Kitchen Note: {order.orderNotes}
                      </div>
                    )}
                  </div>

                  {/* Price Breakdown */}
                  <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-1.5 text-xs font-medium">
                    <div className="font-bold text-stone-900 pb-1 border-b border-stone-100 flex justify-between">
                      <span>Payment Summary</span>
                      <span className="text-[11px] font-semibold text-stone-500">
                        {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI on Delivery'} (Test)
                      </span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Meal Subtotal</span>
                      <span className="font-mono text-stone-900">₹{order.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Insulated Stainless Dabba Deposit</span>
                      <span className="font-mono text-stone-900">₹{order.packagingFee}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Delivery Fee</span>
                      <span className="font-mono text-stone-900">
                        {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}
                      </span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Subscription Discount</span>
                        <span className="font-mono">-₹{order.discount}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-stone-200 flex justify-between items-center text-sm font-extrabold text-stone-950">
                      <span>Final Total</span>
                      <span className="font-mono text-amber-900 text-base">₹{order.finalAmount}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-100">
                  <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Awaiting your fresh hot dabba · Return empty dabba next day</span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => navigate({ name: 'order-confirmation', orderId: order.id })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors shadow-2xs"
                    >
                      <span>Track Order</span>
                      <ExternalLink className="w-3 h-3 text-stone-400" />
                    </button>

                    <button
                      onClick={() => handleReorder(order)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-stone-900 bg-amber-400 hover:bg-amber-500 rounded-lg transition-colors shadow-2xs"
                    >
                      <RotateCcw className="w-3 h-3 text-stone-900" />
                      <span>Reorder Dabba</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
