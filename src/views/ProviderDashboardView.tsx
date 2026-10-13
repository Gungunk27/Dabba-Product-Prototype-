import React, { useState, useEffect, useCallback } from 'react';
import { MealItem, Order, OrderStatus, CreateMealInput, UpdateMealInput } from '../types';
import { TiffinService } from '../services/tiffinService';
import { useCart } from '../context/CartContext';
import {
  ChefHat,
  ShoppingBag,
  ToggleLeft,
  ToggleRight,
  Edit3,
  Plus,
  ArrowLeft,
  RefreshCw,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UtensilsCrossed,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface KitchenProviderOption {
  id: string;
  name: string;
  token: string;
  locality: string;
}

const DEMO_PROVIDERS: KitchenProviderOption[] = [
  {
    id: 'prov-annapurna',
    name: 'Annapurna Kitchen',
    token: 'demo-provider-annapurna-token',
    locality: 'Indiranagar, Bengaluru',
  },
  {
    id: 'prov-shree-krishna',
    name: 'Shree Krishna Shuddha Rasoi',
    token: 'demo-provider-krishna-token',
    locality: 'Malleshwaram, Bengaluru',
  },
];

export const ProviderDashboardView: React.FC = () => {
  const { navigate, showToast } = useCart();

  // Authentication State for Provider Session
  const [selectedProvider, setSelectedProvider] = useState<KitchenProviderOption>(DEMO_PROVIDERS[0]);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Menu State
  const [meals, setMeals] = useState<MealItem[]>([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(true);
  const [togglingMealId, setTogglingMealId] = useState<string | null>(null);

  // General error banner
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Create Meal Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingMeal, setIsCreatingMeal] = useState(false);
  const [createMealError, setCreateMealError] = useState<string | null>(null);
  const [newMealForm, setNewMealForm] = useState<CreateMealInput>({
    title: '',
    tagline: 'Home-cooked comfort dabba',
    description: '',
    pricePerMeal: 120,
    dietType: 'pure_veg',
    cuisine: 'north_indian',
    slot: 'lunch',
    contents: ['Dal Tadka', 'Seasonal Sabzi', '3 Phulkas with Ghee', 'Jeera Rice'],
  });

  // Edit Meal Modal State
  const [editingMeal, setEditingMeal] = useState<MealItem | null>(null);
  const [isUpdatingMeal, setIsUpdatingMeal] = useState(false);
  const [editMealError, setEditMealError] = useState<string | null>(null);
  const [editMealForm, setEditMealForm] = useState<UpdateMealInput>({});

  // Synchronize active provider token
  useEffect(() => {
    TiffinService.setActiveProviderToken(selectedProvider.token);
  }, [selectedProvider]);

  // Load orders strictly for the current authenticated provider
  const loadProviderOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    setDashboardError(null);
    try {
      const fetched = await TiffinService.getProviderOrders(selectedProvider.token);
      setOrders(fetched);
    } catch (err: unknown) {
      setDashboardError(err instanceof Error ? err.message : 'Failed to load provider orders.');
    } finally {
      setIsLoadingOrders(false);
    }
  }, [selectedProvider.token]);

  // Load meals strictly for the current authenticated provider
  const loadProviderMeals = useCallback(async () => {
    setIsLoadingMeals(true);
    try {
      const fetched = await TiffinService.getProviderMeals(selectedProvider.token);
      setMeals(fetched);
    } catch (err: unknown) {
      setDashboardError(err instanceof Error ? err.message : 'Failed to load provider menu.');
    } finally {
      setIsLoadingMeals(false);
    }
  }, [selectedProvider.token]);

  useEffect(() => {
    loadProviderOrders();
    loadProviderMeals();
  }, [loadProviderOrders, loadProviderMeals]);

  // Handle switching kitchen identity in the UI to demonstrate strict authorization & ownership
  const handleSwitchProvider = (prov: KitchenProviderOption) => {
    setSelectedProvider(prov);
    TiffinService.setActiveProviderToken(prov.token);
    showToast(`Switched active provider session to ${prov.name}`);
  };

  // Status transitions
  const handleTransitionStatus = async (orderId: string, targetStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await TiffinService.updateOrderStatus(orderId, targetStatus, selectedProvider.token);
      setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: targetStatus } : o)));
      showToast(`Order ${orderId} moved to '${targetStatus}'`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status transition failed';
      alert(`Error updating order status: ${msg}`);
      showToast(`Transition failed: ${msg}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Toggle meal availability (Activate / Deactivate)
  const handleToggleMealAvailability = async (meal: MealItem) => {
    setTogglingMealId(meal.id);
    const targetAvailability = !meal.isAvailable;
    try {
      await TiffinService.toggleProviderMealAvailability(meal.id, targetAvailability, selectedProvider.token);
      setMeals(prev => prev.map(m => (m.id === meal.id ? { ...m, isAvailable: targetAvailability } : m)));
      showToast(`${meal.title} is now ${targetAvailability ? 'Available' : 'Deactivated (Sold Out)'}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change availability';
      alert(`Error updating availability: ${msg}`);
    } finally {
      setTogglingMealId(null);
    }
  };

  // Create meal submission
  const handleCreateMealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingMeal(true);
    setCreateMealError(null);
    try {
      const created = await TiffinService.createProviderMeal(newMealForm, selectedProvider.token);
      setMeals(prev => [created, ...prev]);
      setIsCreateModalOpen(false);
      showToast(`Created new meal "${created.title}"`);
      // Reset form
      setNewMealForm({
        title: '',
        tagline: 'Home-cooked comfort dabba',
        description: '',
        pricePerMeal: 120,
        dietType: 'pure_veg',
        cuisine: 'north_indian',
        slot: 'lunch',
        contents: ['Dal Tadka', 'Seasonal Sabzi', '3 Phulkas with Ghee', 'Jeera Rice'],
      });
    } catch (err: unknown) {
      setCreateMealError(err instanceof Error ? err.message : 'Failed to create meal on server');
    } finally {
      setIsCreatingMeal(false);
    }
  };

  // Edit meal submission
  const handleOpenEditModal = (meal: MealItem) => {
    setEditingMeal(meal);
    setEditMealError(null);
    setEditMealForm({
      title: meal.title,
      description: meal.description,
      pricePerMeal: meal.pricePerMeal,
      dietType: meal.dietType,
      cuisine: meal.cuisine,
      slot: meal.slot,
      isAvailable: meal.isAvailable,
      tagline: meal.tagline,
    });
  };

  const handleUpdateMealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeal) return;
    setIsUpdatingMeal(true);
    setEditMealError(null);
    try {
      const updated = await TiffinService.updateProviderMeal(editingMeal.id, editMealForm, selectedProvider.token);
      setMeals(prev => prev.map(m => (m.id === editingMeal.id ? updated : m)));
      setEditingMeal(null);
      showToast(`Updated "${updated.title}" successfully`);
    } catch (err: unknown) {
      setEditMealError(err instanceof Error ? err.message : 'Failed to update meal on server');
    } finally {
      setIsUpdatingMeal(false);
    }
  };

  // Metric counts
  const requestedOrdersCount = orders.filter(o => o.status === 'requested').length;
  const inProgressOrdersCount = orders.filter(o => ['accepted', 'confirmed', 'preparing', 'ready'].includes(o.status)).length;
  const completedOrdersCount = orders.filter(o => ['completed', 'delivered'].includes(o.status)).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* 1. Test Environment Notice Banner */}
      <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-900 rounded-xl">
            <AlertTriangle className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <div className="font-extrabold text-sm flex items-center gap-2">
              <span>TEST-ORDER PROVIDER DASHBOARD</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                Simulated Dispatch
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-0.5">
              Orders here are test requests for verification. No live courier has been dispatched and no real payment has been processed.
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold text-amber-900 bg-amber-100/80 border border-amber-200 px-3 py-1.5 rounded-xl whitespace-nowrap self-stretch sm:self-auto text-center">
          Strict Provider Isolation Active
        </div>
      </div>

      {/* 2. Top Header & Provider Identity Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div>
          <button
            onClick={() => navigate({ name: 'home' })}
            className="text-xs text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1.5 mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Marketplace Discovery
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-stone-900">{selectedProvider.name}</h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" /> Verified Partner
                </span>
              </div>
              <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5" /> {selectedProvider.locality} · Kitchen ID:{' '}
                <span className="font-mono font-bold text-stone-700">{selectedProvider.id}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Multi-Kitchen Identity Selector for Testing Isolation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 bg-stone-50 border border-stone-200 p-2.5 rounded-xl">
          <div className="text-[11px] font-semibold text-stone-500 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Authenticated Kitchen Session:
          </div>
          <div className="flex items-center gap-1.5">
            {DEMO_PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => handleSwitchProvider(p)}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                  selectedProvider.id === p.id
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-1">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            New Requested Orders
          </span>
          <div className="text-2xl font-extrabold text-amber-600 tabular-nums">
            {requestedOrdersCount} <span className="text-xs font-normal text-stone-500">awaiting action</span>
          </div>
          <span className="text-[11px] text-amber-800 font-medium">Accept or reject in kitchen</span>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-1">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            Cooking & Ready
          </span>
          <div className="text-2xl font-extrabold text-blue-600 tabular-nums">
            {inProgressOrdersCount} <span className="text-xs font-normal text-stone-500">in kitchen</span>
          </div>
          <span className="text-[11px] text-stone-500">Accepted · Preparing · Ready</span>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-1">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            Completed Test Orders
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
            {completedOrdersCount} <span className="text-xs font-normal text-stone-500">finished</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">Test cycle closed</span>
        </div>
      </div>

      {/* 4. Tab Navigation Strip */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Incoming Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'menu'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" /> Menu Management ({meals.length})
          </button>
        </div>

        <button
          onClick={() => {
            loadProviderOrders();
            loadProviderMeals();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {dashboardError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{dashboardError}</span>
        </div>
      )}

      {/* 5. TAB A: INCOMING ORDERS */}
      {activeTab === 'orders' && (
        <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span>Incoming Orders for {selectedProvider.name}</span>
                <span className="text-[11px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                  Own Meals Only
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                Server enforces ownership: Providers only see and transition orders containing their own kitchen&apos;s meals.
              </p>
            </div>
            <div className="text-xs font-medium text-stone-500">
              {orders.length} Total Orders Received
            </div>
          </div>

          {isLoadingOrders ? (
            <div className="py-12 text-center text-xs text-stone-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
              <span>Loading provider orders from server...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-xs text-stone-500 border border-dashed border-stone-200 rounded-xl space-y-3">
              <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="font-semibold text-stone-700">No incoming orders found for this kitchen yet.</p>
              <p className="text-stone-400 max-w-sm mx-auto">
                Place a test order for {selectedProvider.name}&apos;s meals from the customer marketplace to see it appear here instantly!
              </p>
              <button
                onClick={() => navigate({ name: 'home' })}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs"
              >
                Go to Marketplace
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 pr-4 font-semibold">Order ID</th>
                    <th className="py-2.5 pr-4 font-semibold">Customer & Address</th>
                    <th className="py-2.5 pr-4 font-semibold">Meals & Quantity</th>
                    <th className="py-2.5 pr-4 font-semibold">Slot</th>
                    <th className="py-2.5 pr-4 font-semibold">Total Amount</th>
                    <th className="py-2.5 pr-4 font-semibold">Current Status</th>
                    <th className="py-2.5 font-semibold">State Machine Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {orders.map(order => {
                    const isUpdating = updatingOrderId === order.id;

                    return (
                      <tr key={order.id} className="hover:bg-stone-50/80 transition-colors">
                        {/* Order ID & Created At */}
                        <td className="py-3 pr-4 align-top">
                          <span className="font-mono font-bold text-stone-900 block">{order.id}</span>
                          <span className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        {/* Customer & Address */}
                        <td className="py-3 pr-4 align-top">
                          <span className="font-bold text-stone-900 block">{order.customerName}</span>
                          <span className="text-stone-500 truncate block max-w-xs text-[11px]">
                            {order.deliveryAddress}, {order.locality}
                          </span>
                          {order.orderNotes && (
                            <span className="inline-block mt-1 text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                              Note: {order.orderNotes}
                            </span>
                          )}
                        </td>

                        {/* Meals & Quantities */}
                        <td className="py-3 pr-4 align-top">
                          {order.items.map((it, idx) => (
                            <span key={idx} className="block font-medium text-stone-800">
                              <span className="font-bold text-amber-700">{it.quantity}x</span> {it.meal.title}
                              <span className="text-[10px] text-stone-400 ml-1">
                                ({it.frequency === 'single_trial' ? 'Trial' : it.frequency === 'weekly_6days' ? 'Weekly' : 'Monthly'})
                              </span>
                            </span>
                          ))}
                        </td>

                        {/* Delivery Slot */}
                        <td className="py-3 pr-4 align-top">
                          <span className="capitalize font-semibold text-stone-800 px-2 py-0.5 rounded bg-stone-100 text-[11px]">
                            {order.deliverySlot}
                          </span>
                        </td>

                        {/* Total Amount */}
                        <td className="py-3 pr-4 align-top font-bold text-stone-900 tabular-nums">
                          ₹{order.finalAmount}
                          <span className="block text-[10px] text-stone-400 font-normal">Test Snapshot</span>
                        </td>

                        {/* Current Status Badge */}
                        <td className="py-3 pr-4 align-top">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold capitalize ${
                              order.status === 'requested'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : order.status === 'accepted' || order.status === 'confirmed'
                                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                : order.status === 'preparing'
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                : order.status === 'ready'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : order.status === 'completed' || order.status === 'delivered'
                                ? 'bg-stone-200 text-stone-800 border border-stone-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>

                        {/* Authorized Provider State Transition Actions */}
                        <td className="py-3 align-top">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {order.status === 'requested' && (
                              <>
                                <button
                                  disabled={isUpdating}
                                  onClick={() => handleTransitionStatus(order.id, 'accepted')}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  {isUpdating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                  Accept Order
                                </button>
                                <button
                                  disabled={isUpdating}
                                  onClick={() => handleTransitionStatus(order.id, 'rejected')}
                                  className="px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  <XCircle className="w-3 h-3" />
                                  Reject
                                </button>
                              </>
                            )}

                            {(order.status === 'accepted' || order.status === 'confirmed') && (
                              <>
                                <button
                                  disabled={isUpdating}
                                  onClick={() => handleTransitionStatus(order.id, 'preparing')}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  {isUpdating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UtensilsCrossed className="w-3 h-3" />}
                                  Start Cooking (Preparing)
                                </button>
                                <button
                                  disabled={isUpdating}
                                  onClick={() => handleTransitionStatus(order.id, 'cancelled')}
                                  className="px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded transition-colors disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                            {order.status === 'preparing' && (
                              <>
                                <button
                                  disabled={isUpdating}
                                  onClick={() => handleTransitionStatus(order.id, 'ready')}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  {isUpdating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                  Food Ready in Kitchen
                                </button>
                                <button
                                  disabled={isUpdating}
                                  onClick={() => handleTransitionStatus(order.id, 'cancelled')}
                                  className="px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded transition-colors disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                            {order.status === 'ready' && (
                              <>
                                <button
                                  disabled={isUpdating}
                                  onClick={() => handleTransitionStatus(order.id, 'completed')}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-stone-900 hover:bg-stone-800 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  {isUpdating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                  Complete Order
                                </button>
                                <span className="text-[10px] text-stone-400 italic" title="Orders ready cannot be cancelled per clearly defined status rules">
                                  (Cannot cancel: Food ready)
                                </span>
                              </>
                            )}

                            {(order.status === 'completed' || order.status === 'delivered') && (
                              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Order Completed (Final)
                              </span>
                            )}

                            {order.status === 'rejected' && (
                              <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> Rejected by Kitchen
                              </span>
                            )}

                            {order.status === 'cancelled' && (
                              <span className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> Cancelled
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* 6. TAB B: MENU MANAGEMENT */}
      {activeTab === 'menu' && (
        <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span>Menu Management for {selectedProvider.name}</span>
              </h2>
              <p className="text-xs text-stone-500">
                Create new meal offerings, update meal details and prices, and toggle daily availability (sold out).
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add New Meal Offering
            </button>
          </div>

          {isLoadingMeals ? (
            <div className="py-12 text-center text-xs text-stone-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
              <span>Loading provider menu from server...</span>
            </div>
          ) : meals.length === 0 ? (
            <div className="py-16 text-center text-xs text-stone-500 border border-dashed border-stone-200 rounded-xl space-y-3">
              <UtensilsCrossed className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="font-semibold text-stone-700">No meals listed yet for this kitchen.</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-amber-600 text-white font-bold rounded-lg text-xs"
              >
                Create First Meal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meals.map(meal => {
                const isToggling = togglingMealId === meal.id;

                return (
                  <div
                    key={meal.id}
                    className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                      meal.isAvailable
                        ? 'border-stone-200 bg-white hover:border-stone-300'
                        : 'border-stone-200 bg-stone-50/70 opacity-80'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-stone-900 text-sm">{meal.title}</h3>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                meal.isAvailable
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-stone-200 text-stone-700'
                              }`}
                            >
                              {meal.isAvailable ? 'In Stock' : 'Deactivated (Sold Out)'}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{meal.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-stone-900 text-base">₹{meal.pricePerMeal}</span>
                          <span className="text-[10px] text-stone-400 block">per meal</span>
                        </div>
                      </div>

                      {/* Attributes */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                        <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded font-medium capitalize">
                          {meal.dietType.replace('_', ' ')}
                        </span>
                        <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded font-medium capitalize">
                          {meal.cuisine.replace('_', ' ')}
                        </span>
                        <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded font-medium capitalize">
                          {meal.slot} slot
                        </span>
                        <span className="text-stone-400">· ID: {meal.id}</span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between border-t border-stone-100 pt-3 mt-3">
                      <button
                        disabled={isToggling}
                        onClick={() => handleToggleMealAvailability(meal)}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                          meal.isAvailable
                            ? 'text-rose-700 hover:bg-rose-50'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {isToggling ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : meal.isAvailable ? (
                          <ToggleRight className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-stone-400" />
                        )}
                        <span>{meal.isAvailable ? 'Mark Sold Out' : 'Activate (In Stock)'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(meal)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Meal
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 7. MODAL: CREATE NEW MEAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-stone-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-stone-900">Create New Meal Offering</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            {createMealError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {createMealError}
              </div>
            )}

            <form onSubmit={handleCreateMealSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Meal Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Kathiyawadi Thali"
                  value={newMealForm.title}
                  onChange={e => setNewMealForm({ ...newMealForm, title: e.target.value })}
                  className="w-full p-2.5 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Tagline</label>
                <input
                  type="text"
                  placeholder="e.g. Traditional Gujarati spices with hot rotis"
                  value={newMealForm.tagline || ''}
                  onChange={e => setNewMealForm({ ...newMealForm, tagline: e.target.value })}
                  className="w-full p-2.5 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe meal contents, cooking style, and freshness guarantee..."
                  value={newMealForm.description}
                  onChange={e => setNewMealForm({ ...newMealForm, description: e.target.value })}
                  className="w-full p-2.5 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Price Per Meal (₹) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newMealForm.pricePerMeal}
                    onChange={e => setNewMealForm({ ...newMealForm, pricePerMeal: Number(e.target.value) })}
                    className="w-full p-2.5 border border-stone-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Diet Type *</label>
                  <select
                    value={newMealForm.dietType}
                    onChange={e => setNewMealForm({ ...newMealForm, dietType: e.target.value as any })}
                    className="w-full p-2.5 border border-stone-300 rounded-lg text-xs bg-white"
                  >
                    <option value="pure_veg">Pure Veg</option>
                    <option value="jain">Jain (No Onion/Garlic)</option>
                    <option value="egg_curry">Egg Curry</option>
                    <option value="homestyle">Homestyle Low Spice</option>
                    <option value="low_oil">Heart Healthy / Low Oil</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Cuisine Region *</label>
                  <select
                    value={newMealForm.cuisine}
                    onChange={e => setNewMealForm({ ...newMealForm, cuisine: e.target.value as any })}
                    className="w-full p-2.5 border border-stone-300 rounded-lg text-xs bg-white"
                  >
                    <option value="north_indian">North Indian</option>
                    <option value="south_indian">South Indian</option>
                    <option value="gujarati">Gujarati</option>
                    <option value="maharashtrian">Maharashtrian</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Delivery Slot *</label>
                  <select
                    value={newMealForm.slot}
                    onChange={e => setNewMealForm({ ...newMealForm, slot: e.target.value as any })}
                    className="w-full p-2.5 border border-stone-300 rounded-lg text-xs bg-white"
                  >
                    <option value="lunch">Lunch Only</option>
                    <option value="dinner">Dinner Only</option>
                    <option value="both">Both Lunch & Dinner</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingMeal}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isCreatingMeal && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Create Meal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: EDIT MEAL */}
      {editingMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-stone-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-stone-800" />
                <h3 className="text-base font-bold text-stone-900">Edit Meal: {editingMeal.title}</h3>
              </div>
              <button
                onClick={() => setEditingMeal(null)}
                className="text-stone-400 hover:text-stone-600 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            {editMealError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {editMealError}
              </div>
            )}

            <form onSubmit={handleUpdateMealSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editMealForm.title || ''}
                  onChange={e => setEditMealForm({ ...editMealForm, title: e.target.value })}
                  className="w-full p-2.5 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Tagline</label>
                <input
                  type="text"
                  value={editMealForm.tagline || ''}
                  onChange={e => setEditMealForm({ ...editMealForm, tagline: e.target.value })}
                  className="w-full p-2.5 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editMealForm.description || ''}
                  onChange={e => setEditMealForm({ ...editMealForm, description: e.target.value })}
                  className="w-full p-2.5 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Price Per Meal (₹)</label>
                  <input
                    type="number"
                    min={1}
                    value={editMealForm.pricePerMeal || ''}
                    onChange={e => setEditMealForm({ ...editMealForm, pricePerMeal: Number(e.target.value) })}
                    className="w-full p-2.5 border border-stone-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Delivery Slot</label>
                  <select
                    value={editMealForm.slot || 'lunch'}
                    onChange={e => setEditMealForm({ ...editMealForm, slot: e.target.value as any })}
                    className="w-full p-2.5 border border-stone-300 rounded-lg text-xs bg-white"
                  >
                    <option value="lunch">Lunch Only</option>
                    <option value="dinner">Dinner Only</option>
                    <option value="both">Both Lunch & Dinner</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditingMeal(null)}
                  className="px-4 py-2 text-stone-600 hover:text-stone-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingMeal}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUpdatingMeal && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
