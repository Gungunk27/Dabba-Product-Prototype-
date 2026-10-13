import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import {
  testDatabaseConnectivity,
  getActiveProviders,
  getAvailableMeals,
  createOrderServerSide,
  getOrderByIdServerSide,
  updateOrderStatusServerSide,
  getProviderOrdersServerSide,
  getProviderMealsServerSide,
  createMealServerSide,
  updateMealServerSide,
  toggleMealAvailabilityServerSide,
  isSupabaseConfigured,
  AuthenticationError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
} from './src/server/supabaseAdmin';
import { OrderStatus } from './src/types';

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

// ==============================================================================
// 1. Health & Database Connectivity Diagnostic Endpoint
// ==============================================================================
app.get('/api/status', async (_req: Request, res: Response) => {
  try {
    const report = await testDatabaseConnectivity();
    res.json(report);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      isConfigured: isSupabaseConfigured,
      isLiveConnection: false,
      isDemoMode: !isSupabaseConfigured,
      message: `Database check error: ${errorMsg}`,
      verifiedOperations: [],
      error: errorMsg,
    });
  }
});

// ==============================================================================
// 2. Active Providers for Public Discovery (Enforces is_active = true)
// ==============================================================================
app.get('/api/providers', async (_req: Request, res: Response) => {
  try {
    const { data, isDemoMode } = await getActiveProviders();
    res.setHeader('X-TiffinTrack-Data-Source', isDemoMode ? 'demo_store' : 'supabase_postgres');
    res.json({
      providers: data,
      isDemoMode,
      total: data.length,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // Explicit error response, NO silent fallback!
    res.status(500).json({
      error: 'Failed to fetch active providers from database',
      details: errorMsg,
    });
  }
});

// ==============================================================================
// 3. Available Meals for Public Discovery (Enforces is_available = true)
// ==============================================================================
app.get('/api/meals', async (req: Request, res: Response) => {
  try {
    const filters = {
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      diet: typeof req.query.diet === 'string' ? req.query.diet : undefined,
      cuisine: typeof req.query.cuisine === 'string' ? req.query.cuisine : undefined,
      slot: typeof req.query.slot === 'string' ? req.query.slot : undefined,
      locality: typeof req.query.locality === 'string' ? req.query.locality : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      providerId: typeof req.query.providerId === 'string' ? req.query.providerId : undefined,
    };

    const { data, isDemoMode } = await getAvailableMeals(filters);
    res.setHeader('X-TiffinTrack-Data-Source', isDemoMode ? 'demo_store' : 'supabase_postgres');
    res.json({
      meals: data,
      isDemoMode,
      total: data.length,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // Explicit error response, NO silent fallback!
    res.status(500).json({
      error: 'Failed to fetch available meals from database',
      details: errorMsg,
    });
  }
});

// ==============================================================================
// 4. Server-Side Validated Order Creation
// - Derives customer from authenticated session (Authorization: Bearer <token>)
// - Re-fetches meal & validates availability and active provider
// - Validates quantities & required fields
// - Authoritatively calculates prices and saves price snapshot
// - Prevents duplicate submissions
// - Starts in 'requested' status
// ==============================================================================
app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const result = await createOrderServerSide(req.body, authHeader);
    const statusCode = result.isDuplicate ? 200 : 201;
    res.status(statusCode).json(result);
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      res.status(401).json({
        error: 'Authentication Required',
        message: err.message,
      });
      return;
    }
    if (err instanceof ValidationError) {
      res.status(400).json({
        error: 'Validation Failed',
        message: err.message,
      });
      return;
    }
    if (err instanceof NotFoundError) {
      res.status(404).json({
        error: 'Not Found',
        message: err.message,
      });
      return;
    }
    const errorMsg = err instanceof Error ? err.message : 'Invalid order payload';
    res.status(500).json({
      error: 'Order creation failed',
      message: errorMsg,
    });
  }
});

// ==============================================================================
// 5. Server-Side Order Retrieval with Ownership Verification
// Enforces that customers can only view their own orders; admins/providers can view theirs
// ==============================================================================
app.get('/api/orders/:id', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const authHeader = req.headers.authorization;
    const result = await getOrderByIdServerSide(orderId, authHeader);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      res.status(401).json({
        error: 'Authentication Required',
        message: err.message,
      });
      return;
    }
    if (err instanceof ForbiddenError) {
      res.status(403).json({
        error: 'Forbidden',
        message: err.message,
      });
      return;
    }
    if (err instanceof NotFoundError) {
      res.status(404).json({
        error: 'Order Not Found',
        message: err.message,
      });
      return;
    }
    const errorMsg = err instanceof Error ? err.message : 'Failed to retrieve order';
    res.status(500).json({
      error: 'Order retrieval failed',
      message: errorMsg,
    });
  }
});

// ==============================================================================
// 6. Server-Side Validated Order Status Transitions
// ==============================================================================
app.patch('/api/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    const authHeader = req.headers.authorization;

    if (!status) {
      res.status(400).json({ error: 'Missing target status in request body.' });
      return;
    }

    const result = await updateOrderStatusServerSide(orderId, status as OrderStatus, authHeader);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      res.status(401).json({
        error: 'Authentication Required',
        message: err.message,
      });
      return;
    }
    if (err instanceof ForbiddenError) {
      res.status(403).json({
        error: 'Forbidden',
        message: err.message,
      });
      return;
    }
    if (err instanceof ValidationError) {
      res.status(400).json({
        error: 'Invalid status transition',
        message: err.message,
      });
      return;
    }
    if (err instanceof NotFoundError) {
      res.status(404).json({
        error: 'Not Found',
        message: err.message,
      });
      return;
    }
    const errorMsg = err instanceof Error ? err.message : 'Status transition failed';
    res.status(500).json({
      error: 'Status transition failed',
      message: errorMsg,
    });
  }
});

// ==============================================================================
// 7. Provider Dashboard Orders Endpoint
// Returns incoming orders strictly for the authenticated provider's kitchen
// ==============================================================================
app.get('/api/provider/orders', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const result = await getProviderOrdersServerSide(authHeader);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      res.status(401).json({
        error: 'Authentication Required',
        message: err.message,
      });
      return;
    }
    if (err instanceof ForbiddenError) {
      res.status(403).json({
        error: 'Forbidden',
        message: err.message,
      });
      return;
    }
    const errorMsg = err instanceof Error ? err.message : 'Failed to retrieve provider orders';
    res.status(500).json({
      error: 'Provider orders query failed',
      message: errorMsg,
    });
  }
});

// ==============================================================================
// 8. Provider Menu Management Endpoints (List, Create, Edit, Toggle Availability)
// ==============================================================================
app.get('/api/provider/meals', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const result = await getProviderMealsServerSide(authHeader);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      res.status(401).json({ error: 'Authentication Required', message: err.message });
      return;
    }
    if (err instanceof ForbiddenError) {
      res.status(403).json({ error: 'Forbidden', message: err.message });
      return;
    }
    const errorMsg = err instanceof Error ? err.message : 'Failed to retrieve meals';
    res.status(500).json({ error: 'Provider meals query failed', message: errorMsg });
  }
});

app.post('/api/provider/meals', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const result = await createMealServerSide(req.body, authHeader);
    res.status(201).json(result);
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      res.status(401).json({ error: 'Authentication Required', message: err.message });
      return;
    }
    if (err instanceof ForbiddenError) {
      res.status(403).json({ error: 'Forbidden', message: err.message });
      return;
    }
    if (err instanceof ValidationError) {
      res.status(400).json({ error: 'Validation Failed', message: err.message });
      return;
    }
    const errorMsg = err instanceof Error ? err.message : 'Failed to create meal';
    res.status(500).json({ error: 'Meal creation failed', message: errorMsg });
  }
});

app.put('/api/provider/meals/:id', async (req: Request, res: Response) => {
  try {
    const mealId = req.params.id;
    const authHeader = req.headers.authorization;
    const result = await updateMealServerSide(mealId, req.body, authHeader);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      res.status(401).json({ error: 'Authentication Required', message: err.message });
      return;
    }
    if (err instanceof ForbiddenError) {
      res.status(403).json({ error: 'Forbidden', message: err.message });
      return;
    }
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: 'Not Found', message: err.message });
      return;
    }
    if (err instanceof ValidationError) {
      res.status(400).json({ error: 'Validation Failed', message: err.message });
      return;
    }
    const errorMsg = err instanceof Error ? err.message : 'Failed to update meal';
    res.status(500).json({ error: 'Meal update failed', message: errorMsg });
  }
});

app.patch('/api/provider/meals/:id/availability', async (req: Request, res: Response) => {
  try {
    const mealId = req.params.id;
    const { isAvailable } = req.body;
    const authHeader = req.headers.authorization;
    if (typeof isAvailable !== 'boolean') {
      res.status(400).json({ error: 'Validation Failed', message: 'isAvailable must be a boolean.' });
      return;
    }
    const result = await toggleMealAvailabilityServerSide(mealId, isAvailable, authHeader);
    res.json(result);
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      res.status(401).json({ error: 'Authentication Required', message: err.message });
      return;
    }
    if (err instanceof ForbiddenError) {
      res.status(403).json({ error: 'Forbidden', message: err.message });
      return;
    }
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: 'Not Found', message: err.message });
      return;
    }
    const errorMsg = err instanceof Error ? err.message : 'Failed to toggle meal availability';
    res.status(500).json({ error: 'Meal availability update failed', message: errorMsg });
  }
});

// ==============================================================================
// Server Entry & Dev / Production Mounting
// ==============================================================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TiffinTrack] Server running on http://localhost:${PORT}`);
    console.log(`[TiffinTrack] Supabase configured: ${isSupabaseConfigured ? 'YES (Live Database)' : 'NO (Explicit Demo Mode)'}`);
  });
}

startServer().catch(err => {
  console.error('[TiffinTrack] Server startup error:', err);
  process.exit(1);
});
