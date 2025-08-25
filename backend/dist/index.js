"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Prevent process from exiting immediately for debugging
setTimeout(() => { console.log('⏰ Debug timeout reached'); }, 1000 * 60 * 10); // 10 minutes
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
// Load environment variables
dotenv_1.default.config();
// Initialize Express app
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
// Log all incoming requests for debugging
app.use((req, res, next) => {
    console.log('Incoming:', req.method, req.originalUrl);
    next();
});
// Middleware
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        console.log('CORS check, incoming origin:', origin);
        if (!origin)
            return callback(null, true);
        // Allow localhost and local network IPs in development
        if (process.env.NODE_ENV === 'development') {
            // Allow localhost
            if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
                return callback(null, true);
            }
            // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
            const localNetworkRegex = /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)\d+\.\d+:\d+$/;
            if (localNetworkRegex.test(origin)) {
                return callback(null, true);
            }
        }
        // Allow any protocol and subdomain for your domain
        const domainRegex = /^https?:\/\/([a-z0-9-]+\.)*repario\.app(:\d+)?$/i;
        if (domainRegex.test(origin)) {
            return callback(null, true);
        }
        // Allow explicit localhost ports
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5175',
            'http://localhost:3000'
        ];
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express_1.default.json());
// JWT utility functions
const generateAccessToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
};
const generateRefreshToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
};
const verifyToken = (token, secret) => {
    try {
        return jsonwebtoken_1.default.verify(token, secret);
    }
    catch (error) {
        return null;
    }
};
// Async wrapper for Express middleware
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
const VALID_STATUSES = ['pending', 'working', 'done', 'refused'];
const DEFAULT_STATUS_MESSAGES = {
    pending: {
        default_message: 'Your invoice is pending. We will start processing it shortly.',
        allow_extra_note: true,
        send_whatsapp: true
    },
    working: {
        default_message: 'We are currently working on your invoice.',
        allow_extra_note: true,
        send_whatsapp: true
    },
    done: {
        default_message: 'Your invoice is done. Thank you for your business!',
        allow_extra_note: true,
        send_whatsapp: true
    },
    refused: {
        default_message: 'Your invoice has been refused. Please contact support for details.',
        allow_extra_note: true,
        send_whatsapp: true
    }
};
async function ensureStatusSettingsForUser(userId) {
    const { data: existing, error } = await supabase
        .from('invoice_status_settings')
        .select('*')
        .eq('user_id', userId);
    if (error) {
        console.error('Error fetching status settings:', error);
        throw error;
    }
    if (existing && existing.length >= VALID_STATUSES.length)
        return existing;
    // Upsert defaults for any missing status
    const toUpsert = VALID_STATUSES.map((status) => ({
        user_id: userId,
        status,
        default_message: DEFAULT_STATUS_MESSAGES[status].default_message,
        allow_extra_note: DEFAULT_STATUS_MESSAGES[status].allow_extra_note,
        send_whatsapp: DEFAULT_STATUS_MESSAGES[status].send_whatsapp
    }));
    const { data: upserted, error: upsertError } = await supabase
        .from('invoice_status_settings')
        .upsert(toUpsert, { onConflict: 'user_id,status' })
        .select('*');
    if (upsertError) {
        console.error('Error upserting default status settings:', upsertError);
        throw upsertError;
    }
    return upserted;
}
async function getStatusSetting(userId, status) {
    const { data, error } = await supabase
        .from('invoice_status_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('status', status)
        .single();
    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching single status setting:', error);
        throw error;
    }
    if (!data) {
        await ensureStatusSettingsForUser(userId);
        const { data: refetch } = await supabase
            .from('invoice_status_settings')
            .select('*')
            .eq('user_id', userId)
            .eq('status', status)
            .single();
        return refetch;
    }
    return data;
}
async function sendWhatsAppMessage(phoneE164, message) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
        console.warn('WhatsApp credentials not configured. Skipping send.');
        return { success: false, details: 'Not configured' };
    }
    try {
        const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
        const payload = {
            messaging_product: 'whatsapp',
            to: phoneE164,
            type: 'text',
            text: { body: message }
        };
        const resp = await axios_1.default.post(url, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return { success: true, details: resp.data };
    }
    catch (err) {
        console.error('WhatsApp send error:', err?.response?.data || err?.message || err);
        return { success: false, details: err?.response?.data || err?.message };
    }
}
// Supabase Auth middleware
const authenticateToken = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
    }
    try {
        // Verify the Supabase JWT token
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            res.status(403).json({ error: 'Invalid or expired token' });
            return;
        }
        // Get user profile from database
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        if (!profile) {
            res.status(403).json({ error: 'User profile not found' });
            return;
        }
        // Attach user info to request
        req.user = {
            userId: user.id,
            email: user.email,
            role: profile.role || 'user'
        };
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
        return;
    }
});
// Admin middleware - requires admin role
const requireAdmin = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (req.user.role !== 'admin') {
        res.status(403).json({ error: 'Admin privileges required' });
        return;
    }
    next();
});
// ===============================
// Admin User Management API Routes
// ===============================
// List all users in the business (admin only)
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Get the admin user's business_id
        const { data: adminProfile, error: adminError } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', req.user.userId)
            .single();
        if (adminError || !adminProfile) {
            res.status(500).json({
                status: 'error',
                error: 'Failed to get admin profile'
            });
            return;
        }
        // Get all users in the same business
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id, email, full_name, phone, role, created_at, updated_at')
            .eq('business_id', adminProfile.business_id)
            .order('created_at', { ascending: false });
        if (usersError) {
            res.status(500).json({
                status: 'error',
                error: `Failed to fetch users: ${usersError.message}`
            });
            return;
        }
        res.json({
            status: 'success',
            data: users || []
        });
    }
    catch (error) {
        console.error('List users error:', error);
        res.status(500).json({
            status: 'error',
            error: 'Internal server error'
        });
    }
});
// Update a user (admin only)
app.put('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { full_name, phone, role } = req.body;
        if (!userId) {
            res.status(400).json({
                status: 'error',
                error: 'User ID is required'
            });
            return;
        }
        // Validate role if provided
        if (role && !['admin', 'manager', 'user'].includes(role)) {
            res.status(400).json({
                status: 'error',
                error: 'Invalid role. Must be admin, manager, or user'
            });
            return;
        }
        // Check if user exists and belongs to the same business
        const { data: userProfile, error: userError } = await supabase
            .from('profiles')
            .select('business_id, role')
            .eq('id', userId)
            .single();
        if (userError) {
            if (userError.code === 'PGRST116') {
                res.status(404).json({
                    status: 'error',
                    error: 'User not found'
                });
                return;
            }
            res.status(500).json({
                status: 'error',
                error: `Failed to find user: ${userError.message}`
            });
            return;
        }
        // Get admin's business_id
        const { data: adminProfile, error: adminError } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', req.user.userId)
            .single();
        if (adminError || !adminProfile) {
            res.status(500).json({
                status: 'error',
                error: 'Failed to get admin profile'
            });
            return;
        }
        // Check if user belongs to the same business
        if (userProfile.business_id !== adminProfile.business_id) {
            res.status(403).json({
                status: 'error',
                error: 'Cannot update user from different business'
            });
            return;
        }
        // Build update object with only provided fields
        const updates = { updated_at: new Date().toISOString() };
        if (full_name !== undefined)
            updates.full_name = full_name;
        if (phone !== undefined)
            updates.phone = phone;
        if (role !== undefined)
            updates.role = role;
        // Update the user profile
        const { data: updatedUser, error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select('id, email, full_name, phone, role, created_at, updated_at')
            .single();
        if (updateError) {
            res.status(500).json({
                status: 'error',
                error: `Failed to update user: ${updateError.message}`
            });
            return;
        }
        res.json({
            status: 'success',
            data: updatedUser,
            message: 'User updated successfully'
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            status: 'error',
            error: 'Internal server error'
        });
    }
});
// Create a new user (admin only)
app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { email, password, full_name, phone, role } = req.body;
        // Validate required fields
        if (!email || !password || !full_name || !phone || !role) {
            res.status(400).json({
                status: 'error',
                error: 'All fields are required: email, password, full_name, phone, role'
            });
            return;
        }
        // Validate role
        if (!['admin', 'manager', 'user'].includes(role)) {
            res.status(400).json({
                status: 'error',
                error: 'Invalid role. Must be admin, manager, or user'
            });
            return;
        }
        // Get the admin user's business_id
        const { data: adminProfile, error: adminError } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', req.user.userId)
            .single();
        if (adminError || !adminProfile) {
            res.status(500).json({
                status: 'error',
                error: 'Failed to get admin profile'
            });
            return;
        }
        // Create user in Supabase Auth using service role
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name,
                phone,
                role,
                business_id: adminProfile.business_id
            }
        });
        if (authError || !authUser.user) {
            res.status(500).json({
                status: 'error',
                error: `Failed to create auth user: ${authError?.message}`
            });
            return;
        }
        // Insert profile record
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
            id: authUser.user.id,
            business_id: adminProfile.business_id,
            full_name,
            phone,
            role,
            email
        });
        if (profileError) {
            // Clean up auth user if profile creation fails
            await supabase.auth.admin.deleteUser(authUser.user.id);
            res.status(500).json({
                status: 'error',
                error: `Failed to create user profile: ${profileError.message}`
            });
            return;
        }
        res.status(201).json({
            status: 'success',
            message: 'User created successfully'
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            status: 'error',
            error: 'Internal server error'
        });
    }
});
// Delete a user (admin only)
app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            res.status(400).json({
                status: 'error',
                error: 'User ID is required'
            });
            return;
        }
        // Check if user exists and belongs to the same business
        const { data: userProfile, error: userError } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', userId)
            .single();
        if (userError) {
            if (userError.code === 'PGRST116') {
                res.status(404).json({
                    status: 'error',
                    error: 'User not found'
                });
                return;
            }
            res.status(500).json({
                status: 'error',
                error: `Failed to find user: ${userError.message}`
            });
            return;
        }
        // Get admin's business_id
        const { data: adminProfile, error: adminError } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', req.user.userId)
            .single();
        if (adminError || !adminProfile) {
            res.status(500).json({
                status: 'error',
                error: 'Failed to get admin profile'
            });
            return;
        }
        // Check if user belongs to the same business
        if (userProfile.business_id !== adminProfile.business_id) {
            res.status(403).json({
                status: 'error',
                error: 'Cannot delete user from different business'
            });
            return;
        }
        // Prevent self-deletion
        if (userId === req.user.userId) {
            res.status(400).json({
                status: 'error',
                error: 'Cannot delete your own account'
            });
            return;
        }
        // Delete from profiles first (due to RLS)
        const { error: profileDeleteError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
        if (profileDeleteError) {
            res.status(500).json({
                status: 'error',
                error: `Failed to delete user profile: ${profileDeleteError.message}`
            });
            return;
        }
        // Delete from Supabase Auth
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
        if (authDeleteError) {
            console.error('Warning: Profile deleted but auth user deletion failed:', authDeleteError);
            // Continue anyway since profile is deleted
        }
        res.json({
            status: 'success',
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            status: 'error',
            error: 'Internal server error'
        });
    }
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Development-only endpoint to create a test user
if (process.env.NODE_ENV !== 'production') {
    app.post('/api/auth/dev-create-user', async (req, res) => {
        try {
            const { email, password, fullName } = req.body;
            if (!email || !password) {
                res.status(400).json({ error: 'Email and password are required' });
                return;
            }
            // Check if user already exists
            const { data: existingUser, error: checkError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .single();
            if (existingUser) {
                res.status(409).json({ error: 'User already exists' });
                return;
            }
            // Hash password
            const saltRounds = 12;
            const passwordHash = await bcrypt_1.default.hash(password, saltRounds);
            // Create user in Supabase
            const userData = {
                email,
                password_hash: passwordHash,
                display_name: fullName || null,
                role: 'user'
            };
            const { data: user, error } = await supabase
                .from('profiles')
                .insert(userData)
                .select()
                .single();
            if (error) {
                res.status(500).json({ error: 'Failed to create user', details: error });
                return;
            }
            res.status(201).json({
                message: 'Test user created successfully',
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.display_name,
                    role: user.role
                }
            });
        }
        catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });
}
// Public configuration endpoint (no auth required)
app.get('/config', (req, res) => {
    const config = {
        apiUrl: process.env.API_URL ||
            (process.env.NODE_ENV === 'production'
                ? 'https://ahmedaldelemy.space'
                : `http://localhost:${PORT}`),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    };
    res.json(config);
});
// ===============================
// Status Settings endpoints
// ===============================
app.get('/api/status-settings', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const data = await ensureStatusSettingsForUser(userId);
        res.json(data);
    }
    catch (error) {
        console.error('Status settings fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch status settings' });
    }
});
app.put('/api/status-settings', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const settings = Array.isArray(req.body) ? req.body : [];
        const sanitized = settings
            .filter((s) => VALID_STATUSES.includes(s.status))
            .map((s) => ({
            user_id: userId,
            status: s.status,
            default_message: String(s.default_message || ''),
            allow_extra_note: Boolean(s.allow_extra_note),
            send_whatsapp: s.send_whatsapp === undefined ? true : Boolean(s.send_whatsapp)
        }));
        const { data, error } = await supabase
            .from('invoice_status_settings')
            .upsert(sanitized, { onConflict: 'user_id,status' })
            .select('*');
        if (error) {
            console.error('Status settings update error:', error);
            res.status(500).json({ error: 'Failed to update status settings' });
            return;
        }
        res.json(data);
    }
    catch (error) {
        console.error('Status settings update exception:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Auth routes
app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('📝 Registration attempt:', { email: req.body.email, fullName: req.body.fullName });
        const { email, password, fullName } = req.body;
        if (!email || !password) {
            console.log('❌ Missing email or password');
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        // Check if user already exists
        console.log('🔍 Checking if user exists...');
        const { data: existingUser, error: checkError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('❌ Error checking existing user:', checkError);
            res.status(500).json({ error: 'Database error' });
            return;
        }
        if (existingUser) {
            console.log('❌ User already exists');
            res.status(409).json({ error: 'User already exists' });
            return;
        }
        // Hash password
        console.log('🔐 Hashing password...');
        const saltRounds = 12;
        const passwordHash = await bcrypt_1.default.hash(password, saltRounds);
        // Create user in Supabase
        console.log('👤 Creating user in database...');
        const userData = {
            email,
            password_hash: passwordHash,
            display_name: fullName || null,
            role: 'user'
        };
        console.log('📝 User data to insert:', userData);
        const { data: user, error } = await supabase
            .from('profiles')
            .insert(userData)
            .select()
            .single();
        if (error) {
            console.error('❌ Supabase registration error:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            res.status(500).json({ error: 'Failed to create user' });
            return;
        }
        console.log('✅ User created successfully:', user);
        // Generate tokens
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role
        };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);
        console.log('🔑 Tokens generated successfully');
        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.display_name,
                role: user.role
            },
            accessToken,
            refreshToken
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        // Get user from Supabase
        const { data: user, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();
        if (error || !user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        // Verify password
        const isValidPassword = await bcrypt_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        // Generate tokens
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role
        };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role
            },
            accessToken,
            refreshToken
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/api/auth/refresh', (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(401).json({ error: 'Refresh token required' });
            return;
        }
        const payload = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
        if (!payload) {
            res.status(403).json({ error: 'Invalid or expired refresh token' });
            return;
        }
        // Remove exp, iat, nbf if present
        const { exp, iat, nbf, ...cleanPayload } = payload;
        // Generate new access and refresh tokens
        const newAccessToken = generateAccessToken(cleanPayload);
        const newRefreshToken = generateRefreshToken(cleanPayload);
        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });
        // Do not log anything on success
    }
    catch (error) {
        // Log only the error message
        if (error instanceof Error) {
            console.error('Token refresh error:', error.message);
        }
        else {
            console.error('Token refresh error:', error);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Register with business creation endpoint
app.post('/api/auth/register-business', async (req, res) => {
    try {
        console.log('🏢 Business registration attempt:', {
            email: req.body.email,
            fullName: req.body.fullName,
            businessName: req.body.businessName
        });
        const { email, password, fullName, businessName } = req.body;
        if (!email || !password || !fullName || !businessName) {
            console.log('❌ Missing required fields');
            res.status(400).json({ error: 'Email, password, full name, and business name are required' });
            return;
        }
        // Check if user already exists in auth
        console.log('🔍 Checking if user exists in auth...');
        const { data: usersList, error: authCheckError } = await supabase.auth.admin.listUsers();
        if (authCheckError) {
            console.error('❌ Error checking existing auth user:', authCheckError);
            res.status(500).json({ error: 'Database error checking user' });
            return;
        }
        const existingUser = usersList.users.find(user => user.email === email);
        if (existingUser) {
            console.log('❌ User already exists in auth');
            res.status(409).json({ error: 'User already exists' });
            return;
        }
        // Create user in Supabase Auth using service role (bypasses email confirmation)
        console.log('👤 Creating user in Supabase Auth...');
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // This bypasses email confirmation
            user_metadata: {
                full_name: fullName
            }
        });
        if (authError || !authUser.user) {
            console.error('❌ Supabase auth user creation error:', authError);
            res.status(500).json({ error: `Failed to create user: ${authError?.message}` });
            return;
        }
        console.log('✅ Auth user created:', authUser.user.id);
        // Create business and admin profile using RPC function
        console.log('🏢 Creating business with admin...');
        const { data: businessData, error: businessError } = await supabase
            .rpc('create_business_with_admin', {
            p_business_name: businessName,
            p_admin_user_id: authUser.user.id,
            p_admin_full_name: fullName,
            p_admin_phone: null // Optional parameter
        });
        if (businessError) {
            console.error('❌ Business creation error:', businessError);
            // Clean up auth user if business creation fails
            await supabase.auth.admin.deleteUser(authUser.user.id);
            res.status(500).json({ error: `Failed to create business: ${businessError.message}` });
            return;
        }
        console.log('✅ Business created successfully:', businessData);
        // Return success with user data (compatible with frontend expectations)
        res.status(201).json({
            message: 'User and business created successfully',
            user: {
                id: authUser.user.id,
                email: authUser.user.email,
                fullName: fullName,
                business_id: businessData
            },
            // User is created and confirmed, ready for immediate sign-in
            userConfirmed: true
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Protected routes - Supabase proxy
app.get('/api/layouts', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('layouts')
            .select(`
        *,
        layout_sections (
          *,
          layout_fields (
            *,
            layout_field_options (*)
          )
        )
      `)
            .eq('user_id', req.user.userId)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to fetch layouts' });
            return;
        }
        // Transform data to match frontend expectations
        const transformedData = data.map((layout) => ({
            id: layout.id,
            name: layout.name,
            description: layout.description,
            isDefault: layout.is_default, // Transform snake_case to camelCase
            createdAt: layout.created_at,
            updatedAt: layout.updated_at,
            sections: layout.layout_sections?.map((section) => ({
                id: section.id,
                title: section.title,
                sort_order: section.sort_order,
                fields: section.layout_fields?.map((field) => ({
                    id: field.id,
                    label: field.label,
                    type: field.type,
                    placeholder: field.placeholder,
                    required: field.required,
                    sort_order: field.sort_order,
                    options: field.layout_field_options?.map((option) => ({
                        id: option.id,
                        label: option.label,
                        value: option.value,
                        sort_order: option.sort_order
                    })) || []
                })) || []
            })) || []
        }));
        res.json(transformedData);
    }
    catch (error) {
        console.error('Layouts fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get single layout by ID
app.get('/api/layouts/:id', authenticateToken, async (req, res) => {
    try {
        const layoutId = req.params.id;
        console.log('🔍 Fetching layout by ID:', {
            layoutId,
            userId: req.user.userId
        });
        const { data, error } = await supabase
            .from('layouts')
            .select(`
        *,
        layout_sections (
          *,
          layout_fields (
            *,
            layout_field_options (*)
          )
        )
      `)
            .eq('id', layoutId)
            .eq('user_id', req.user.userId)
            .single();
        if (error) {
            console.error('❌ Supabase error:', error);
            if (error.code === 'PGRST116') {
                res.status(404).json({ error: 'Layout not found' });
            }
            else {
                res.status(500).json({ error: 'Failed to fetch layout' });
            }
            return;
        }
        // Transform data to match frontend expectations
        const transformedLayout = {
            id: data.id,
            name: data.name,
            description: data.description,
            isDefault: data.is_default, // Transform snake_case to camelCase
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            sections: data.layout_sections?.map((section) => ({
                id: section.id,
                title: section.title,
                sort_order: section.sort_order,
                fields: section.layout_fields?.map((field) => ({
                    id: field.id,
                    label: field.label,
                    type: field.type,
                    placeholder: field.placeholder,
                    required: field.required,
                    sort_order: field.sort_order,
                    options: field.layout_field_options?.map((option) => ({
                        id: option.id,
                        label: option.label,
                        value: option.value,
                        sort_order: option.sort_order
                    })) || []
                })) || []
            })) || []
        };
        console.log('✅ Layout fetched successfully:', {
            id: transformedLayout.id,
            name: transformedLayout.name,
            sectionsCount: transformedLayout.sections.length
        });
        res.json(transformedLayout);
    }
    catch (error) {
        console.error('💥 Layout fetch by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/api/layouts', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Layout creation request:', {
            body: req.body,
            userId: req.user.userId,
            user: req.user
        });
        // Map frontend field names to database field names
        const layoutData = {
            name: req.body.name,
            description: req.body.description || '',
            is_default: req.body.isDefault || req.body.is_default || false,
            user_id: req.user.userId
        };
        console.log('📝 Layout data to insert:', layoutData);
        const { data, error } = await supabase
            .from('layouts')
            .insert(layoutData)
            .select()
            .single();
        if (error) {
            console.error('❌ Supabase error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            res.status(500).json({ error: 'Failed to create layout' });
            return;
        }
        console.log('✅ Layout created successfully:', data);
        // Transform the response to match frontend expectations
        const transformedLayout = {
            id: data.id,
            name: data.name,
            description: data.description,
            isDefault: data.is_default, // Transform snake_case to camelCase
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            sections: [] // New layouts start with empty sections
        };
        res.status(201).json(transformedLayout);
    }
    catch (error) {
        console.error('💥 Layout creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Add section to layout
app.post('/api/layouts/:id/sections', authenticateToken, async (req, res) => {
    try {
        const layoutId = req.params.id;
        const { title, sort_order = 0 } = req.body;
        console.log('🔍 Adding section to layout:', {
            layoutId,
            title,
            sort_order,
            userId: req.user.userId
        });
        // Verify layout belongs to user
        const { data: layout, error: layoutError } = await supabase
            .from('layouts')
            .select('id')
            .eq('id', layoutId)
            .eq('user_id', req.user.userId)
            .single();
        if (layoutError || !layout) {
            res.status(404).json({ error: 'Layout not found' });
            return;
        }
        const sectionData = {
            layout_id: layoutId,
            title,
            sort_order
        };
        const { data, error } = await supabase
            .from('layout_sections')
            .insert(sectionData)
            .select()
            .single();
        if (error) {
            console.error('❌ Supabase error:', error);
            res.status(500).json({ error: 'Failed to create section' });
            return;
        }
        const transformedSection = {
            id: data.id,
            title: data.title,
            sort_order: data.sort_order,
            fields: []
        };
        console.log('✅ Section created successfully:', transformedSection);
        res.status(201).json(transformedSection);
    }
    catch (error) {
        console.error('💥 Section creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update section
app.patch('/api/layouts/:id/sections/:sectionId', authenticateToken, async (req, res) => {
    try {
        const { id: layoutId, sectionId } = req.params;
        const { title, sort_order } = req.body;
        console.log('🔍 Updating section:', {
            layoutId,
            sectionId,
            title,
            sort_order,
            userId: req.user.userId
        });
        // Verify layout belongs to user
        const { data: layout, error: layoutError } = await supabase
            .from('layouts')
            .select('id')
            .eq('id', layoutId)
            .eq('user_id', req.user.userId)
            .single();
        if (layoutError || !layout) {
            res.status(404).json({ error: 'Layout not found' });
            return;
        }
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (sort_order !== undefined)
            updateData.sort_order = sort_order;
        const { data, error } = await supabase
            .from('layout_sections')
            .update(updateData)
            .eq('id', sectionId)
            .eq('layout_id', layoutId)
            .select()
            .single();
        if (error) {
            console.error('❌ Supabase error:', error);
            if (error.code === 'PGRST116') {
                res.status(404).json({ error: 'Section not found' });
            }
            else {
                res.status(500).json({ error: 'Failed to update section' });
            }
            return;
        }
        const transformedSection = {
            id: data.id,
            title: data.title,
            sort_order: data.sort_order
        };
        console.log('✅ Section updated successfully:', transformedSection);
        res.json(transformedSection);
    }
    catch (error) {
        console.error('💥 Section update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete section
app.delete('/api/layouts/:id/sections/:sectionId', authenticateToken, async (req, res) => {
    try {
        const { id: layoutId, sectionId } = req.params;
        console.log('🔍 Deleting section:', {
            layoutId,
            sectionId,
            userId: req.user.userId
        });
        // Verify layout belongs to user
        const { data: layout, error: layoutError } = await supabase
            .from('layouts')
            .select('id')
            .eq('id', layoutId)
            .eq('user_id', req.user.userId)
            .single();
        if (layoutError || !layout) {
            res.status(404).json({ error: 'Layout not found' });
            return;
        }
        const { error } = await supabase
            .from('layout_sections')
            .delete()
            .eq('id', sectionId)
            .eq('layout_id', layoutId);
        if (error) {
            console.error('❌ Supabase error:', error);
            res.status(500).json({ error: 'Failed to delete section' });
            return;
        }
        console.log('✅ Section deleted successfully');
        res.status(204).send();
    }
    catch (error) {
        console.error('💥 Section deletion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Add field to section
app.post('/api/layouts/:id/sections/:sectionId/fields', authenticateToken, async (req, res) => {
    try {
        const { id: layoutId, sectionId } = req.params;
        const { label, type, placeholder, required = false, sort_order = 0, options } = req.body;
        console.log('🔍 Adding field to section:', {
            layoutId,
            sectionId,
            label,
            type,
            hasOptions: options ? options.length : 0,
            userId: req.user.userId
        });
        // Verify layout belongs to user and section exists
        const { data: layout, error: layoutError } = await supabase
            .from('layouts')
            .select('id')
            .eq('id', layoutId)
            .eq('user_id', req.user.userId)
            .single();
        if (layoutError || !layout) {
            res.status(404).json({ error: 'Layout not found' });
            return;
        }
        // Verify section belongs to layout
        const { data: section, error: sectionError } = await supabase
            .from('layout_sections')
            .select('id')
            .eq('id', sectionId)
            .eq('layout_id', layoutId)
            .single();
        if (sectionError || !section) {
            res.status(404).json({ error: 'Section not found' });
            return;
        }
        const fieldData = {
            section_id: sectionId,
            label,
            type,
            placeholder,
            required,
            sort_order
        };
        const { data, error } = await supabase
            .from('layout_fields')
            .insert(fieldData)
            .select()
            .single();
        if (error) {
            console.error('❌ Supabase error:', error);
            res.status(500).json({ error: 'Failed to create field' });
            return;
        }
        // Add options if provided
        const savedOptions = [];
        if (options && Array.isArray(options) && options.length > 0) {
            for (const option of options) {
                const optionData = {
                    field_id: data.id,
                    label: option.label,
                    value: option.value || option.label.toLowerCase().replace(/\s+/g, '_')
                };
                const { data: optionResult, error: optionError } = await supabase
                    .from('layout_field_options')
                    .insert(optionData)
                    .select()
                    .single();
                if (!optionError && optionResult) {
                    savedOptions.push({
                        id: optionResult.id,
                        label: optionResult.label,
                        value: optionResult.value
                    });
                }
            }
        }
        const transformedField = {
            id: data.id,
            label: data.label,
            type: data.type,
            placeholder: data.placeholder,
            required: data.required,
            sort_order: data.sort_order,
            options: savedOptions
        };
        console.log('✅ Field created successfully:', transformedField);
        res.status(201).json(transformedField);
    }
    catch (error) {
        console.error('💥 Field creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update field
app.patch('/api/layouts/:id/sections/:sectionId/fields/:fieldId', authenticateToken, async (req, res) => {
    try {
        const { id: layoutId, sectionId, fieldId } = req.params;
        const { label, type, placeholder, required, sort_order, options } = req.body;
        console.log('🔍 Updating field:', {
            layoutId,
            sectionId,
            fieldId,
            hasOptions: options ? options.length : 0,
            userId: req.user.userId
        });
        // Verify layout belongs to user
        const { data: layout, error: layoutError } = await supabase
            .from('layouts')
            .select('id')
            .eq('id', layoutId)
            .eq('user_id', req.user.userId)
            .single();
        if (layoutError || !layout) {
            res.status(404).json({ error: 'Layout not found' });
            return;
        }
        const updateData = {};
        if (label !== undefined)
            updateData.label = label;
        if (type !== undefined)
            updateData.type = type;
        if (placeholder !== undefined)
            updateData.placeholder = placeholder;
        if (required !== undefined)
            updateData.required = required;
        if (sort_order !== undefined)
            updateData.sort_order = sort_order;
        const { data, error } = await supabase
            .from('layout_fields')
            .update(updateData)
            .eq('id', fieldId)
            .eq('section_id', sectionId)
            .select()
            .single();
        if (error) {
            console.error('❌ Supabase error:', error);
            if (error.code === 'PGRST116') {
                res.status(404).json({ error: 'Field not found' });
            }
            else {
                res.status(500).json({ error: 'Failed to update field' });
            }
            return;
        }
        // Handle options update
        let savedOptions = [];
        if (options !== undefined) {
            // Delete existing options
            await supabase
                .from('layout_field_options')
                .delete()
                .eq('field_id', fieldId);
            // Add new options
            if (Array.isArray(options) && options.length > 0) {
                for (const option of options) {
                    const optionData = {
                        field_id: fieldId,
                        label: option.label,
                        value: option.value || option.label.toLowerCase().replace(/\s+/g, '_')
                    };
                    const { data: optionResult, error: optionError } = await supabase
                        .from('layout_field_options')
                        .insert(optionData)
                        .select()
                        .single();
                    if (!optionError && optionResult) {
                        savedOptions.push({
                            id: optionResult.id,
                            label: optionResult.label,
                            value: optionResult.value
                        });
                    }
                }
            }
        }
        else {
            // If options not provided, fetch existing ones
            const { data: existingOptions } = await supabase
                .from('layout_field_options')
                .select('*')
                .eq('field_id', fieldId);
            if (existingOptions) {
                savedOptions = existingOptions.map(option => ({
                    id: option.id,
                    label: option.label,
                    value: option.value
                }));
            }
        }
        const transformedField = {
            id: data.id,
            label: data.label,
            type: data.type,
            placeholder: data.placeholder,
            required: data.required,
            sort_order: data.sort_order,
            options: savedOptions
        };
        console.log('✅ Field updated successfully:', transformedField);
        res.json(transformedField);
    }
    catch (error) {
        console.error('💥 Field update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete field
app.delete('/api/layouts/:id/sections/:sectionId/fields/:fieldId', authenticateToken, async (req, res) => {
    try {
        const { id: layoutId, sectionId, fieldId } = req.params;
        console.log('🔍 Deleting field:', {
            layoutId,
            sectionId,
            fieldId,
            userId: req.user.userId
        });
        // Verify layout belongs to user
        const { data: layout, error: layoutError } = await supabase
            .from('layouts')
            .select('id')
            .eq('id', layoutId)
            .eq('user_id', req.user.userId)
            .single();
        if (layoutError || !layout) {
            res.status(404).json({ error: 'Layout not found' });
            return;
        }
        const { error } = await supabase
            .from('layout_fields')
            .delete()
            .eq('id', fieldId)
            .eq('section_id', sectionId);
        if (error) {
            console.error('❌ Supabase error:', error);
            res.status(500).json({ error: 'Failed to delete field' });
            return;
        }
        console.log('✅ Field deleted successfully');
        res.status(204).send();
    }
    catch (error) {
        console.error('💥 Field deletion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update layout
app.patch('/api/layouts/:id', authenticateToken, async (req, res) => {
    try {
        const layoutId = req.params.id;
        const { name, description, is_default, isDefault } = req.body;
        console.log('🔍 Updating layout:', {
            layoutId,
            body: req.body,
            userId: req.user.userId
        });
        // Handle both snake_case and camelCase for is_default
        const defaultValue = is_default !== undefined ? is_default : isDefault;
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (description !== undefined)
            updateData.description = description;
        if (defaultValue !== undefined)
            updateData.is_default = defaultValue;
        // If setting this layout as default, unset all other defaults for this user
        if (defaultValue === true) {
            await supabase
                .from('layouts')
                .update({ is_default: false })
                .eq('user_id', req.user.userId)
                .neq('id', layoutId);
        }
        const { data, error } = await supabase
            .from('layouts')
            .update(updateData)
            .eq('id', layoutId)
            .eq('user_id', req.user.userId)
            .select()
            .single();
        if (error) {
            console.error('❌ Supabase error:', error);
            if (error.code === 'PGRST116') {
                res.status(404).json({ error: 'Layout not found' });
            }
            else {
                res.status(500).json({ error: 'Failed to update layout' });
            }
            return;
        }
        const transformedLayout = {
            id: data.id,
            name: data.name,
            description: data.description,
            isDefault: data.is_default,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
        console.log('✅ Layout updated successfully:', transformedLayout);
        res.json(transformedLayout);
    }
    catch (error) {
        console.error('💥 Layout update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete layout
app.delete('/api/layouts/:id', authenticateToken, async (req, res) => {
    try {
        const layoutId = req.params.id;
        const { force, reassignTo } = req.query;
        console.log('🔍 Deleting layout:', {
            layoutId,
            userId: req.user.userId,
            force,
            reassignTo
        });
        console.log('📊 Checking for invoices using this layout...');
        // First, check if there are invoices using this layout
        const { data: invoicesUsingLayout, error: invoiceCheckError } = await supabase
            .from('invoices')
            .select('id')
            .eq('layout_id', layoutId)
            .eq('user_id', req.user.userId);
        console.log('📊 Invoice check result:', {
            invoicesCount: invoicesUsingLayout?.length || 0,
            error: invoiceCheckError?.message
        });
        if (invoiceCheckError) {
            console.error('❌ Error checking invoice dependencies:', invoiceCheckError);
            res.status(500).json({ error: 'Failed to check layout dependencies' });
            return;
        }
        // If there are invoices using this layout and no force/reassign parameter
        if (invoicesUsingLayout && invoicesUsingLayout.length > 0) {
            if (!force && !reassignTo) {
                // Get user's other layouts for reassignment options
                const { data: otherLayouts, error: layoutsError } = await supabase
                    .from('layouts')
                    .select('id, name')
                    .eq('user_id', req.user.userId)
                    .neq('id', layoutId)
                    .order('name');
                if (layoutsError) {
                    console.error('❌ Error fetching other layouts:', layoutsError);
                    res.status(500).json({ error: 'Failed to fetch other layouts' });
                    return;
                }
                res.status(409).json({
                    error: 'layout_in_use',
                    message: `This layout is being used by ${invoicesUsingLayout.length} invoice(s)`,
                    invoiceCount: invoicesUsingLayout.length,
                    availableLayouts: otherLayouts || [],
                    canForceDelete: true // Allow force deletion even with no alternatives
                });
                return;
            }
            // If reassignTo is provided, reassign invoices to the new layout
            if (reassignTo) {
                // Verify the target layout exists and belongs to the user
                const { data: targetLayout, error: targetError } = await supabase
                    .from('layouts')
                    .select('id')
                    .eq('id', reassignTo)
                    .eq('user_id', req.user.userId)
                    .single();
                if (targetError || !targetLayout) {
                    res.status(400).json({ error: 'Invalid target layout for reassignment' });
                    return;
                }
                // Reassign all invoices to the new layout
                const { error: reassignError } = await supabase
                    .from('invoices')
                    .update({ layout_id: reassignTo })
                    .eq('layout_id', layoutId)
                    .eq('user_id', req.user.userId);
                if (reassignError) {
                    console.error('❌ Error reassigning invoices:', reassignError);
                    res.status(500).json({ error: 'Failed to reassign invoices' });
                    return;
                }
                console.log(`✅ Reassigned ${invoicesUsingLayout.length} invoices to layout ${reassignTo}`);
            }
            // If force is true, set layout_id to NULL for all invoices using this layout
            if (force === 'true') {
                const { error: nullifyError } = await supabase
                    .from('invoices')
                    .update({ layout_id: null })
                    .eq('layout_id', layoutId)
                    .eq('user_id', req.user.userId);
                if (nullifyError) {
                    console.error('❌ Error nullifying invoice layout references:', nullifyError);
                    res.status(500).json({ error: 'Failed to remove layout references from invoices' });
                    return;
                }
                console.log(`✅ Removed layout reference from ${invoicesUsingLayout.length} invoices (set to NULL)`);
            }
        }
        // Now delete the layout
        const { error } = await supabase
            .from('layouts')
            .delete()
            .eq('id', layoutId)
            .eq('user_id', req.user.userId);
        if (error) {
            console.error('❌ Supabase error:', error);
            // Check if it's a foreign key constraint error
            if (error.code === '23503') {
                res.status(409).json({
                    error: 'layout_in_use',
                    message: 'This layout is still being used by invoices and cannot be deleted'
                });
            }
            else {
                res.status(500).json({ error: 'Failed to delete layout' });
            }
            return;
        }
        console.log('✅ Layout deleted successfully');
        res.status(204).send();
    }
    catch (error) {
        console.error('💥 Layout deletion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/api/invoices', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('invoices')
            .select(`
        *,
        customers (*),
        layouts (*),
        invoice_items (*)
      `)
            .eq('user_id', req.user.userId)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to fetch invoices' });
            return;
        }
        res.json(data);
    }
    catch (error) {
        console.error('Invoices fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Validation functions
const validateCustomerInfo = (customerInfo) => {
    return (customerInfo &&
        typeof customerInfo === 'object' &&
        typeof customerInfo.name === 'string' &&
        customerInfo.name.trim().length > 0);
};
const validateInvoiceItem = (item) => {
    return (item &&
        typeof item === 'object' &&
        typeof item.name === 'string' &&
        item.name.trim().length > 0 &&
        typeof item.quantity === 'number' &&
        item.quantity > 0 &&
        typeof item.price === 'number' &&
        item.price >= 0 &&
        typeof item.total === 'number' &&
        item.total >= 0);
};
const validateInvoiceRequest = (data) => {
    return (data &&
        typeof data === 'object' &&
        validateCustomerInfo(data.customerInfo) &&
        typeof data.layoutId === 'string' &&
        data.layoutId.trim().length > 0 &&
        typeof data.formData === 'object' &&
        Array.isArray(data.items) &&
        data.items.length > 0 &&
        data.items.every(validateInvoiceItem) &&
        (typeof data.status === 'undefined' || VALID_STATUSES.includes(data.status)));
};
// Helper function to calculate string similarity using Levenshtein distance
const calculateStringSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (s1 === s2)
        return 1;
    if (s1.length === 0 || s2.length === 0)
        return 0;
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
};
// Levenshtein distance calculation
const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                matrix[i][j - 1] + 1, // insertion
                matrix[i - 1][j] + 1 // deletion
                );
            }
        }
    }
    return matrix[str2.length][str1.length];
};
// Check for similar customer names to prevent duplicates
const findSimilarCustomers = async (customerName, userId, threshold = 0.85) => {
    try {
        const { data: allCustomers, error } = await supabase
            .from('customers')
            .select('id, name, phone, address')
            .eq('user_id', userId);
        if (error) {
            console.error('Error fetching customers for similarity check:', error);
            return [];
        }
        if (!allCustomers || allCustomers.length === 0) {
            return [];
        }
        const similarCustomers = allCustomers.filter(customer => {
            const similarity = calculateStringSimilarity(customerName.trim(), customer.name);
            return similarity >= threshold && similarity < 1; // Don't include exact matches
        });
        return similarCustomers;
    }
    catch (error) {
        console.error('Error in findSimilarCustomers:', error);
        return [];
    }
};
// Calculate invoice totals
const calculateInvoiceTotals = (items) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax_rate = 0; // Can be made configurable later
    const tax_amount = subtotal * tax_rate;
    const total_amount = subtotal + tax_amount;
    return {
        subtotal: Number(subtotal.toFixed(2)),
        tax_rate: Number(tax_rate.toFixed(4)),
        tax_amount: Number(tax_amount.toFixed(2)),
        total_amount: Number(total_amount.toFixed(2))
    };
};
// Find or create customer
const findOrCreateCustomer = async (customerInfo, userId, req) => {
    try {
        // If customer ID is provided, use the existing customer
        if (customerInfo.id) {
            console.log('🔍 Using provided customer ID:', customerInfo.id);
            // Verify the customer belongs to this user
            const { data: existingCustomer, error: verifyError } = await supabase
                .from('customers')
                .select('id, name, phone, address')
                .eq('id', customerInfo.id)
                .eq('user_id', userId)
                .single();
            if (verifyError || !existingCustomer) {
                throw new Error('Customer not found or access denied');
            }
            // Update customer info if new data is provided and different
            const shouldUpdate = (customerInfo.phone && customerInfo.phone !== existingCustomer.phone) ||
                (customerInfo.address && customerInfo.address !== existingCustomer.address);
            if (shouldUpdate) {
                const updateData = {};
                if (customerInfo.phone)
                    updateData.phone = customerInfo.phone;
                if (customerInfo.address)
                    updateData.address = customerInfo.address;
                const { error: updateError } = await supabase
                    .from('customers')
                    .update(updateData)
                    .eq('id', customerInfo.id)
                    .eq('user_id', userId);
                if (updateError) {
                    console.warn('Failed to update customer info:', updateError.message);
                }
            }
            return customerInfo.id;
        }
        // If no ID provided, proceed with existing logic
        // First, try to find existing customer with exact name match
        const { data: existingCustomer, error: findError } = await supabase
            .from('customers')
            .select('id, phone, address')
            .eq('user_id', userId)
            .eq('name', customerInfo.name.trim())
            .single();
        if (findError && findError.code !== 'PGRST116') {
            throw new Error(`Failed to search for customer: ${findError.message}`);
        }
        if (existingCustomer) {
            // Update customer info if new data is provided and different
            const shouldUpdate = (customerInfo.phone && customerInfo.phone !== existingCustomer.phone) ||
                (customerInfo.address && customerInfo.address !== existingCustomer.address);
            if (shouldUpdate) {
                const updateData = {};
                if (customerInfo.phone)
                    updateData.phone = customerInfo.phone;
                if (customerInfo.address)
                    updateData.address = customerInfo.address;
                const { error: updateError } = await supabase
                    .from('customers')
                    .update(updateData)
                    .eq('id', existingCustomer.id);
                if (updateError) {
                    console.warn('Failed to update customer info:', updateError.message);
                }
            }
            return existingCustomer.id;
        }
        // Check for similar customer names before creating new one (unless forced)
        if (!customerInfo.forceCreate) {
            const similarCustomers = await findSimilarCustomers(customerInfo.name, userId);
            if (similarCustomers.length > 0) {
                const similarNames = similarCustomers.map(c => c.name).join(', ');
                throw new Error(`Similar customer names already exist: ${similarNames}. Please use an existing customer or choose a more distinctive name.`);
            }
        }
        // Create new customer
        // Get user's business_id from their profile
        console.log('🔍 Getting business_id for user:', userId);
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', userId)
            .single();
        console.log('📋 Profile query result:', { userProfile, profileError });
        let businessId = userProfile?.business_id;
        if (profileError || !businessId) {
            console.log('⚠️ User has no business_id, creating default business...');
            // Create a default business for the user
            const { data: newBusiness, error: businessError } = await supabase
                .from('businesses')
                .insert({
                name: 'Default Business',
                owner_id: userId
            })
                .select('id')
                .single();
            if (businessError) {
                console.error('❌ Failed to create default business:', businessError);
                throw new Error('Failed to create user business');
            }
            businessId = newBusiness.id;
            // Update user profile with the new business_id
            const { error: updateProfileError } = await supabase
                .from('profiles')
                .update({ business_id: businessId })
                .eq('id', userId);
            if (updateProfileError) {
                console.warn('⚠️ Failed to update user profile with business_id:', updateProfileError);
            }
            console.log('✅ Created default business with ID:', businessId);
        }
        else {
            console.log('✅ Got business_id:', businessId);
        }
        const insertData = {
            user_id: userId,
            name: customerInfo.name.trim(),
            phone: customerInfo.phone?.trim() || null,
            address: customerInfo.address?.trim() || null,
            business_id: businessId
        };
        console.log('📦 Inserting customer with data (reordered):', insertData);
        // Create customer using user context (not service role) to work with RLS policies
        console.log('📦 Creating customer with user JWT context...');
        // Get the user's JWT token from the request
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('No valid authorization token found');
        }
        const userToken = authHeader.replace('Bearer ', '');
        // Create a new supabase client with the user's JWT token
        const userSupabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, // Use anon key with user token
        {
            global: {
                headers: {
                    Authorization: `Bearer ${userToken}`
                }
            }
        });
        const insertDataForUser = {
            user_id: userId, // Include user_id explicitly
            name: customerInfo.name.trim(),
            phone: customerInfo.phone?.trim() || null,
            address: customerInfo.address?.trim() || null
            // Don't include business_id - let RLS policy handle it
        };
        console.log('📦 Insert data for user context:', insertDataForUser);
        const { data: newCustomer, error: createError } = await userSupabase
            .from('customers')
            .insert(insertDataForUser)
            .select('id')
            .single();
        console.log('📋 Insert result:', { newCustomer, createError });
        if (createError) {
            throw new Error(`Failed to create customer: ${createError.message}`);
        }
        if (!newCustomer) {
            throw new Error('Customer creation succeeded but no customer data returned');
        }
        return newCustomer.id;
    }
    catch (error) {
        console.error('Error in findOrCreateCustomer:', error);
        throw error;
    }
};
// Verify layout ownership
const verifyLayoutOwnership = async (layoutId, userId) => {
    try {
        const { data: layout, error } = await supabase
            .from('layouts')
            .select('id')
            .eq('id', layoutId)
            .eq('user_id', userId)
            .single();
        return !error && !!layout;
    }
    catch (error) {
        console.error('Error verifying layout ownership:', error);
        return false;
    }
};
// CREATE INVOICE ENDPOINT
app.post('/api/invoices', authenticateToken, async (req, res) => {
    try {
        console.log('🆕 New invoice request received');
        console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
        const userId = req.user.userId;
        // Validate request data
        if (!validateInvoiceRequest(req.body)) {
            res.status(400).json({
                error: 'Invalid request data. Please check all required fields.'
            });
            return;
        }
        const { customerInfo, layoutId, formData, items } = req.body;
        // Verify layout exists and belongs to user
        const layoutOwned = await verifyLayoutOwnership(layoutId, userId);
        if (!layoutOwned) {
            res.status(404).json({
                error: 'Layout not found or access denied'
            });
            return;
        }
        // Find or create customer
        let customerId;
        try {
            customerId = await findOrCreateCustomer(customerInfo, userId, req);
        }
        catch (customerError) {
            console.error('❌ Customer error:', customerError.message);
            res.status(400).json({
                error: `Customer error: ${customerError.message}`
            });
            return;
        }
        // Get user's business_id from their profile
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', userId)
            .single();
        if (profileError || !userProfile?.business_id) {
            console.error('❌ Failed to get user business_id:', profileError);
            res.status(500).json({
                error: 'Failed to get user business information'
            });
            return;
        }
        console.log('✅ User business_id retrieved:', userProfile.business_id);
        // Calculate totals
        const totals = calculateInvoiceTotals(items);
        // Create user-authenticated Supabase client for RLS context
        const authHeader = req.headers['authorization'];
        const userToken = authHeader && authHeader.split(' ')[1];
        const userSupabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '', {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            },
            global: {
                headers: {
                    Authorization: `Bearer ${userToken}`
                }
            }
        });
        // Create invoice using user context (this will trigger auto_assign_business_id)
        console.log('🔧 Creating invoice with user context');
        const { data: invoice, error: invoiceError } = await userSupabase
            .from('invoices')
            .insert({
            user_id: userId,
            // Don't include business_id - let the trigger handle it
            customer_id: customerId,
            layout_id: layoutId,
            form_data: formData,
            subtotal: totals.subtotal,
            tax_rate: totals.tax_rate,
            tax_amount: totals.tax_amount,
            total_amount: totals.total_amount,
            status: req.body.status || 'pending'
        })
            .select(`
        *,
        customers (id, name, phone, address),
        layouts (id, name)
      `)
            .single();
        if (invoiceError) {
            console.error('❌ Invoice creation error:', invoiceError);
            res.status(500).json({
                error: 'Failed to create invoice',
                details: invoiceError.message
            });
            return;
        }
        console.log('✅ Invoice created successfully:', invoice.id);
        // Create invoice items
        const itemsToInsert = items.map((item, index) => ({
            invoice_id: invoice.id,
            name: item.name.trim(),
            description: item.description?.trim() || null,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            sort_order: index
        }));
        const { data: insertedItems, error: itemsError } = await supabase
            .from('invoice_items')
            .insert(itemsToInsert)
            .select();
        if (itemsError) {
            console.error('❌ Invoice items creation error:', itemsError);
            // Rollback: delete the invoice since items failed
            await supabase
                .from('invoices')
                .delete()
                .eq('id', invoice.id);
            res.status(500).json({
                error: 'Failed to create invoice items',
                details: itemsError.message
            });
            return;
        }
        console.log('✅ Invoice items created successfully:', insertedItems?.length || 0);
        // Return complete invoice data
        const responseData = {
            ...invoice,
            items: insertedItems,
            totals: {
                subtotal: invoice.subtotal,
                tax_rate: invoice.tax_rate,
                tax_amount: invoice.tax_amount,
                total_amount: invoice.total_amount
            }
        };
        res.status(201).json({
            message: 'Invoice created successfully',
            invoice: responseData
        });
    }
    catch (error) {
        console.error('💥 Invoice creation error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Unknown error occurred'
        });
    }
});
// GET INVOICES ENDPOINT
app.get('/api/invoices', authenticateToken, async (req, res) => {
    try {
        console.log('📋 Fetching invoices for user:', req.user.userId);
        const userId = req.user.userId;
        const { page = 1, limit = 10 } = req.query;
        console.log('📄 Pagination params:', { page, limit });
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { data: invoices, error } = await supabase
            .from('invoices')
            .select(`
        *,
        customers (id, name, phone, address),
        layouts (id, name)
      `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);
        if (error) {
            console.error('❌ Error fetching invoices:', error);
            res.status(500).json({
                error: 'Failed to fetch invoices',
                details: error.message
            });
            return;
        }
        console.log('✅ Invoices fetched successfully:', {
            count: invoices?.length || 0,
            invoices: invoices?.map(inv => ({ id: inv.id, customer: inv.customers?.name, total: inv.total_amount })) || []
        });
        res.json({
            invoices: invoices || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: invoices?.length || 0
            }
        });
    }
    catch (error) {
        console.error('💥 Error fetching invoices:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Unknown error occurred'
        });
    }
});
// GET SINGLE INVOICE ENDPOINT
app.get('/api/invoices/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const invoiceId = req.params.id;
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select(`
        *,
        customers (id, name, phone, address),
        layouts (id, name)
      `)
            .eq('id', invoiceId)
            .eq('user_id', userId)
            .single();
        if (invoiceError || !invoice) {
            res.status(404).json({
                error: 'Invoice not found or access denied'
            });
            return;
        }
        // Get invoice items
        const { data: items, error: itemsError } = await supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', invoiceId)
            .order('sort_order');
        if (itemsError) {
            console.error('❌ Error fetching invoice items:', itemsError);
            res.status(500).json({
                error: 'Failed to fetch invoice items',
                details: itemsError.message
            });
            return;
        }
        const responseData = {
            ...invoice,
            items: items || [],
            totals: {
                subtotal: invoice.subtotal,
                tax_rate: invoice.tax_rate,
                tax_amount: invoice.tax_amount,
                total_amount: invoice.total_amount
            }
        };
        res.json({ invoice: responseData });
    }
    catch (error) {
        console.error('💥 Error fetching invoice:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Unknown error occurred'
        });
    }
});
// PUT INVOICE ENDPOINT - Update existing invoice
app.put('/api/invoices/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const invoiceId = req.params.id;
        const { customerInfo, layoutId, formData, items, status } = req.body;
        console.log('🔄 Updating invoice:', invoiceId, 'for user:', userId);
        // Validate status if provided
        if (status !== undefined && !VALID_STATUSES.includes(status)) {
            res.status(400).json({ error: 'Invalid status value' });
            return;
        }
        // Validate required fields
        if (!customerInfo?.name?.trim()) {
            res.status(400).json({ error: 'Customer name is required' });
            return;
        }
        if (!layoutId) {
            res.status(400).json({ error: 'Layout ID is required' });
            return;
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({ error: 'At least one item is required' });
            return;
        }
        // Verify invoice exists and belongs to user
        const { data: existingInvoice, error: checkError } = await supabase
            .from('invoices')
            .select('id, user_id')
            .eq('id', invoiceId)
            .eq('user_id', userId)
            .single();
        if (checkError || !existingInvoice) {
            res.status(404).json({ error: 'Invoice not found or access denied' });
            return;
        }
        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
        const taxRate = 0; // Default tax rate, can be made configurable
        const taxAmount = subtotal * taxRate;
        const totalAmount = subtotal + taxAmount;
        // Update or create customer using the same logic as POST endpoint
        let customerId;
        try {
            customerId = await findOrCreateCustomer(customerInfo, userId, req);
        }
        catch (customerError) {
            console.error('❌ Customer error during update:', customerError.message);
            res.status(400).json({
                error: `Customer error: ${customerError.message}`
            });
            return;
        }
        // Update invoice
        const updateData = {
            customer_id: customerId,
            layout_id: layoutId,
            form_data: formData || {},
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            updated_at: new Date().toISOString()
        };
        // Include status if provided
        if (status !== undefined) {
            updateData.status = status;
        }
        const { data: updatedInvoice, error: invoiceError } = await supabase
            .from('invoices')
            .update(updateData)
            .eq('id', invoiceId)
            .eq('user_id', userId)
            .select(`
        *,
        customers (id, name, phone, address),
        layouts (id, name)
      `)
            .single();
        if (invoiceError || !updatedInvoice) {
            console.error('❌ Error updating invoice:', invoiceError);
            res.status(500).json({ error: 'Failed to update invoice' });
            return;
        }
        // Delete existing invoice items
        const { error: deleteItemsError } = await supabase
            .from('invoice_items')
            .delete()
            .eq('invoice_id', invoiceId);
        if (deleteItemsError) {
            console.error('❌ Error deleting old invoice items:', deleteItemsError);
            res.status(500).json({ error: 'Failed to update invoice items' });
            return;
        }
        // Insert new invoice items
        const invoiceItems = items.map((item, index) => ({
            invoice_id: invoiceId,
            name: item.name.trim(),
            description: item.description?.trim() || null,
            quantity: Number(item.quantity),
            price: Number(item.price),
            total: Number(item.total),
            sort_order: index
        }));
        const { data: newItems, error: itemsError } = await supabase
            .from('invoice_items')
            .insert(invoiceItems)
            .select('*');
        if (itemsError) {
            console.error('❌ Error creating invoice items:', itemsError);
            res.status(500).json({ error: 'Failed to create invoice items' });
            return;
        }
        const responseData = {
            ...updatedInvoice,
            items: newItems || [],
            totals: {
                subtotal,
                tax_rate: taxRate,
                tax_amount: taxAmount,
                total_amount: totalAmount
            }
        };
        console.log('✅ Invoice updated successfully:', invoiceId);
        res.json({ invoice: responseData });
    }
    catch (error) {
        console.error('💥 Error updating invoice:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Unknown error occurred'
        });
    }
});
// GET CUSTOMERS ENDPOINT
app.get('/api/customers', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { data: customers, error } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', userId)
            .order('name', { ascending: true });
        if (error) {
            console.error('❌ Error fetching customers:', error);
            res.status(500).json({
                error: 'Failed to fetch customers',
                details: error.message
            });
            return;
        }
        res.json({ customers: customers || [] });
    }
    catch (error) {
        console.error('💥 Error fetching customers:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Unknown error occurred'
        });
    }
});
app.post('/api/customers', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        // Note: business_id is automatically assigned by database trigger
        const customerData = {
            ...req.body,
            user_id: userId
        };
        // Validate required fields
        if (!customerData.name?.trim()) {
            res.status(400).json({ error: 'Customer name is required' });
            return;
        }
        // Check for similar customer names
        const similarCustomers = await findSimilarCustomers(customerData.name, userId);
        if (similarCustomers.length > 0) {
            const similarNames = similarCustomers.map(c => c.name).join(', ');
            res.status(400).json({
                error: `Similar customer names already exist: ${similarNames}. Please use an existing customer or choose a more distinctive name.`,
                similarCustomers: similarCustomers
            });
            return;
        }
        // Check for exact match
        const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id, name')
            .eq('name', customerData.name.trim())
            .eq('user_id', userId)
            .single();
        if (existingCustomer) {
            res.status(400).json({
                error: `Customer with name "${customerData.name}" already exists.`,
                existingCustomer: existingCustomer
            });
            return;
        }
        const { data, error } = await supabase
            .from('customers')
            .insert(customerData)
            .select()
            .single();
        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to create customer' });
            return;
        }
        res.status(201).json(data);
    }
    catch (error) {
        console.error('Customer creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ===============================
// Items API Endpoints
// ===============================
// Get all items for the authenticated user
app.get('/api/items', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('user_id', req.user.userId)
            .eq('is_active', true)
            .order('name');
        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to fetch items' });
            return;
        }
        res.json(data);
    }
    catch (error) {
        console.error('Items fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get a specific item by ID
app.get('/api/items/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.userId)
            .single();
        if (error) {
            console.error('Supabase error:', error);
            res.status(404).json({ error: 'Item not found' });
            return;
        }
        res.json(data);
    }
    catch (error) {
        console.error('Item fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create a new item
app.post('/api/items', async (req, res) => {
    try {
        console.log('🆕 Creating new item - Request received');
        console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
        console.log('🔐 Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
        // Manual authentication check with better error handling
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            console.log('❌ No authorization token provided');
            res.status(401).json({ error: 'Access token required' });
            return;
        }
        let user;
        try {
            // Verify the Supabase JWT token
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
            if (authError || !authUser) {
                console.log('❌ Token verification failed:', authError?.message);
                res.status(403).json({ error: 'Invalid or expired token' });
                return;
            }
            // Get user profile from database
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();
            if (profileError || !profile) {
                console.log('❌ User profile not found:', profileError?.message);
                res.status(403).json({ error: 'User profile not found' });
                return;
            }
            user = {
                userId: authUser.id,
                email: authUser.email,
                role: profile.role || 'user'
            };
            console.log('✅ User authenticated:', user.userId);
        }
        catch (authError) {
            console.error('❌ Authentication error:', authError.message);
            res.status(500).json({ error: 'Authentication failed' });
            return;
        }
        // Validate required fields
        if (!req.body.name || typeof req.body.name !== 'string' || req.body.name.trim() === '') {
            console.log('❌ Validation failed: name is required and must be a non-empty string');
            res.status(400).json({ error: 'Item name is required and must be a non-empty string' });
            return;
        }
        // Handle unit_price validation with multiple formats
        let unitPrice = 0;
        if (req.body.unit_price !== undefined && req.body.unit_price !== null && req.body.unit_price !== '') {
            if (typeof req.body.unit_price === 'string') {
                unitPrice = parseFloat(req.body.unit_price);
            }
            else if (typeof req.body.unit_price === 'number') {
                unitPrice = req.body.unit_price;
            }
            else {
                console.log('❌ Validation failed: unit_price must be a number or string:', typeof req.body.unit_price);
                res.status(400).json({ error: 'Unit price must be a number' });
                return;
            }
            if (isNaN(unitPrice) || unitPrice < 0) {
                console.log('❌ Validation failed: invalid unit_price value:', req.body.unit_price);
                res.status(400).json({ error: 'Unit price must be a valid positive number' });
                return;
            }
        }
        // Prepare item data with proper type conversion and defaults
        // Note: business_id is automatically assigned by database trigger
        const itemData = {
            name: req.body.name.trim(),
            description: req.body.description && typeof req.body.description === 'string' ? req.body.description.trim() : null,
            unit_price: unitPrice,
            unit: req.body.unit && typeof req.body.unit === 'string' ? req.body.unit.trim() : 'each',
            sku: req.body.sku && typeof req.body.sku === 'string' ? req.body.sku.trim() : null,
            category: req.body.category && typeof req.body.category === 'string' ? req.body.category.trim() : null,
            user_id: user.userId,
            is_active: true
        };
        // Clean up empty strings to null
        if (itemData.description === '')
            itemData.description = null;
        if (itemData.sku === '')
            itemData.sku = null;
        if (itemData.category === '')
            itemData.category = null;
        if (itemData.unit === '')
            itemData.unit = 'each';
        console.log('📝 Item data to insert:', JSON.stringify(itemData, null, 2));
        const { data, error } = await supabase
            .from('items')
            .insert(itemData)
            .select()
            .single();
        if (error) {
            console.error('❌ Supabase error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            // Provide more specific error messages based on error codes
            let errorMessage = 'Failed to create item';
            if (error.code === '23505') {
                errorMessage = 'Item with this SKU already exists';
            }
            else if (error.code === '23502') {
                errorMessage = 'Missing required field';
            }
            else if (error.code === '23514') {
                errorMessage = 'Invalid data format';
            }
            res.status(500).json({
                error: errorMessage,
                details: error.message,
                code: error.code
            });
            return;
        }
        console.log('✅ Item created successfully:', data.id);
        res.status(201).json(data);
    }
    catch (error) {
        console.error('💥 Item creation error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});
// Update an existing item
app.patch('/api/items/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('items')
            .update(req.body)
            .eq('id', id)
            .eq('user_id', req.user.userId)
            .select()
            .single();
        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to update item' });
            return;
        }
        res.json(data);
    }
    catch (error) {
        console.error('Item update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete an item (soft delete by setting is_active to false)
app.delete('/api/items/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('items')
            .update({ is_active: false })
            .eq('id', id)
            .eq('user_id', req.user.userId)
            .select()
            .single();
        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to delete item' });
            return;
        }
        res.json({ message: 'Item deleted successfully' });
    }
    catch (error) {
        console.error('Item deletion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ===============================
// Invoices API Endpoints
// ===============================
// Get all invoices for the authenticated user
app.get('/api/invoices', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', req.user.userId)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to fetch invoices' });
            return;
        }
        res.json(data);
    }
    catch (error) {
        console.error('Invoices fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get a single invoice by ID with customer and items data
app.get('/api/invoices/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        // Fetch invoice with customer data
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select(`
        *,
        customers (
          id,
          name,
          phone,
          address
        )
      `)
            .eq('id', id)
            .eq('user_id', req.user.userId)
            .single();
        if (invoiceError) {
            console.error('Supabase invoice fetch error:', invoiceError);
            if (invoiceError.code === 'PGRST116') {
                res.status(404).json({ error: 'Invoice not found' });
            }
            else {
                res.status(500).json({ error: 'Failed to fetch invoice' });
            }
            return;
        }
        // Fetch invoice items
        const { data: items, error: itemsError } = await supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', id)
            .order('created_at');
        if (itemsError) {
            console.error('Supabase items fetch error:', itemsError);
            // Continue without items rather than failing completely
        }
        // Add items to invoice object
        const invoiceWithItems = {
            ...invoice,
            items: items || []
        };
        res.json({ invoice: invoiceWithItems });
    }
    catch (error) {
        console.error('Invoice fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update an existing invoice - FORCED RESTART 2024-08-19 23:46
app.put('/api/invoices/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🚨 NEW PUT ENDPOINT - Invoice update request for:', id);
        console.log('🚨 NEW PUT ENDPOINT - Request body:', req.body);
        // Map frontend fields to DB columns
        const updateData = {
            user_id: req.user.userId,
            updated_at: new Date().toISOString()
        };
        // Map frontend fields to DB columns
        if (req.body.customerId)
            updateData.customer_id = req.body.customerId;
        if (req.body.customer_id)
            updateData.customer_id = req.body.customer_id;
        if (req.body.layoutId)
            updateData.layout_id = req.body.layoutId;
        if (req.body.layout_id)
            updateData.layout_id = req.body.layout_id;
        if (req.body.formData)
            updateData.form_data = req.body.formData;
        if (req.body.form_data)
            updateData.form_data = req.body.form_data;
        if (req.body.status !== undefined)
            updateData.status = req.body.status;
        if (updateData.status !== undefined) {
            if (!VALID_STATUSES.includes(updateData.status)) {
                res.status(400).json({ error: 'Invalid status value' });
                return;
            }
        }
        console.log('🚨 NEW PUT ENDPOINT - Updating with data:', updateData);
        const { data: result, error } = await supabase
            .from('invoices')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', req.user.userId)
            .select()
            .single();
        if (error) {
            console.error('🚨 NEW PUT ENDPOINT - Update failed:', error);
            res.status(500).json({ error: 'Failed to update invoice', details: error.message });
            return;
        }
        console.log('🚨 NEW PUT ENDPOINT - SUCCESS! Updated invoice:', result.id);
        res.json({ invoice: result });
    }
    catch (error) {
        console.error('🚨 NEW PUT ENDPOINT - Exception:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update invoice status and optionally send WhatsApp notification
app.patch('/api/invoices/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, extra_note } = req.body;
        const userId = req.user.userId;
        if (!status || !VALID_STATUSES.includes(status)) {
            res.status(400).json({ error: 'Invalid or missing status' });
            return;
        }
        // Fetch invoice (get customer_id)
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select(`id, user_id, customer_id, status`)
            .eq('id', id)
            .eq('user_id', userId)
            .single();
        if (invoiceError || !invoice) {
            res.status(404).json({ error: 'Invoice not found' });
            return;
        }
        // Update status
        const { data: updated, error: updateError } = await supabase
            .from('invoices')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();
        if (updateError) {
            console.error('Status update error:', updateError);
            res.status(500).json({ error: 'Failed to update status' });
            return;
        }
        // Fetch user status settings
        const setting = await getStatusSetting(userId, status);
        let whatsappResult = { success: false };
        let customerPhone = null;
        if (setting?.send_whatsapp && invoice?.customer_id) {
            const { data: customer } = await supabase
                .from('customers')
                .select('phone')
                .eq('id', invoice.customer_id)
                .eq('user_id', userId)
                .single();
            customerPhone = customer?.phone || null;
        }
        if (setting?.send_whatsapp && customerPhone) {
            let message = setting.default_message || '';
            const trimmedExtra = typeof extra_note === 'string' ? extra_note.trim() : '';
            if (setting.allow_extra_note && trimmedExtra) {
                message = `${message}\n\n${trimmedExtra}`;
            }
            whatsappResult = await sendWhatsAppMessage(customerPhone, message);
        }
        res.json({ invoice: updated, whatsapp: whatsappResult });
    }
    catch (error) {
        console.error('Invoice status change error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// DELETE INVOICE ENDPOINT
app.delete('/api/invoices/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const invoiceId = req.params.id;
        console.log('🗑️ Delete invoice request for:', invoiceId, 'by user:', userId);
        // First, verify the invoice belongs to the user
        const { data: invoice, error: fetchError } = await supabase
            .from('invoices')
            .select('id, user_id')
            .eq('id', invoiceId)
            .eq('user_id', userId)
            .single();
        if (fetchError || !invoice) {
            console.error('❌ Invoice not found or access denied:', fetchError);
            res.status(404).json({ error: 'Invoice not found' });
            return;
        }
        // Delete invoice items first (due to foreign key constraint)
        const { error: deleteItemsError } = await supabase
            .from('invoice_items')
            .delete()
            .eq('invoice_id', invoiceId);
        if (deleteItemsError) {
            console.error('❌ Error deleting invoice items:', deleteItemsError);
            res.status(500).json({ error: 'Failed to delete invoice items' });
            return;
        }
        // Delete the invoice
        const { error: deleteInvoiceError } = await supabase
            .from('invoices')
            .delete()
            .eq('id', invoiceId)
            .eq('user_id', userId);
        if (deleteInvoiceError) {
            console.error('❌ Error deleting invoice:', deleteInvoiceError);
            res.status(500).json({ error: 'Failed to delete invoice' });
            return;
        }
        console.log('✅ Invoice deleted successfully:', invoiceId);
        res.json({ message: 'Invoice deleted successfully' });
    }
    catch (error) {
        console.error('❌ Delete invoice error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ===============================
// Customers API Endpoints
// ===============================
// Get all customers for the authenticated user
app.get('/api/customers', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', req.user.userId)
            .eq('is_active', true)
            .order('name');
        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to fetch customers' });
            return;
        }
        res.json(data);
    }
    catch (error) {
        console.error('Customers fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create a new customer
app.post('/api/customers', authenticateToken, async (req, res) => {
    try {
        const customerData = {
            ...req.body,
            user_id: req.user.userId
        };
        const { data, error } = await supabase
            .from('customers')
            .insert(customerData)
            .select()
            .single();
        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to create customer' });
            return;
        }
        res.status(201).json(data);
    }
    catch (error) {
        console.error('Customer creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update a customer
app.put('/api/customers/:id', authenticateToken, async (req, res) => {
    try {
        const customerId = req.params.id;
        const { name, phone, address } = req.body;
        console.log('✏️ Updating customer:', { customerId, name, phone, address, userId: req.user.userId });
        // Verify customer belongs to user
        const { data: existingCustomer, error: findError } = await supabase
            .from('customers')
            .select('id')
            .eq('id', customerId)
            .eq('user_id', req.user.userId)
            .single();
        if (findError || !existingCustomer) {
            console.log('❌ Customer not found or access denied');
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        const updateData = {};
        if (name !== undefined)
            updateData.name = name.trim();
        if (phone !== undefined)
            updateData.phone = phone?.trim() || null;
        if (address !== undefined)
            updateData.address = address?.trim() || null;
        updateData.updated_at = new Date().toISOString();
        const { data, error } = await supabase
            .from('customers')
            .update(updateData)
            .eq('id', customerId)
            .eq('user_id', req.user.userId)
            .select()
            .single();
        if (error) {
            console.error('❌ Supabase error:', error);
            res.status(500).json({ error: 'Failed to update customer' });
            return;
        }
        console.log('✅ Customer updated successfully:', data);
        res.json(data);
    }
    catch (error) {
        console.error('💥 Customer update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete a customer
app.delete('/api/customers/:id', authenticateToken, async (req, res) => {
    try {
        const customerId = req.params.id;
        console.log('🗑️ Deleting customer:', { customerId, userId: req.user.userId });
        // Verify customer belongs to user
        const { data: existingCustomer, error: findError } = await supabase
            .from('customers')
            .select('id, name')
            .eq('id', customerId)
            .eq('user_id', req.user.userId)
            .single();
        if (findError || !existingCustomer) {
            console.log('❌ Customer not found or access denied');
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        // Check if customer has any invoices
        const { data: invoices, error: invoiceCheckError } = await supabase
            .from('invoices')
            .select('id')
            .eq('customer_id', customerId)
            .eq('user_id', req.user.userId);
        if (invoiceCheckError) {
            console.error('❌ Error checking customer invoices:', invoiceCheckError);
            res.status(500).json({ error: 'Failed to check customer dependencies' });
            return;
        }
        if (invoices && invoices.length > 0) {
            console.log('❌ Cannot delete customer with existing invoices');
            res.status(400).json({
                error: 'Cannot delete customer with existing invoices',
                details: `This customer has ${invoices.length} invoice(s). Please delete the invoices first.`
            });
            return;
        }
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', customerId)
            .eq('user_id', req.user.userId);
        if (error) {
            console.error('❌ Supabase error:', error);
            res.status(500).json({ error: 'Failed to delete customer' });
            return;
        }
        console.log('✅ Customer deleted successfully:', existingCustomer.name);
        res.status(204).send();
    }
    catch (error) {
        console.error('💥 Customer deletion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Start server
// In production, use a process manager like PM2 or systemd to keep the server running.
// For HTTPS, use a reverse proxy (Nginx, Caddy, Traefik) and set up SSL certificates.
app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
    console.log('✅ app.listen callback finished');
});
console.log('✅ End of index.ts file reached');
process.on('exit', (code) => {
    console.log(`❗ Process exit event with code: ${code}`);
});
process.on('SIGINT', () => {
    console.log('❗ SIGINT received, exiting...');
    process.exit();
});
process.on('uncaughtException', (err) => {
    console.error('❗ Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❗ Unhandled Rejection at:', promise, 'reason:', reason);
});
//# sourceMappingURL=index.js.map