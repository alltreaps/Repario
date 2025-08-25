"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
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
        // Allow localhost in development
        if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:')) {
            return callback(null, true);
        }
        // Allow any protocol and subdomain for your domain
        const domainRegex = /^https?:\/\/([a-z0-9-]+\.)*ahmedaldelemy\.space(:\d+)?$/i;
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
        console.log('🔍 Deleting layout:', {
            layoutId,
            userId: req.user.userId
        });
        const { error } = await supabase
            .from('layouts')
            .delete()
            .eq('id', layoutId)
            .eq('user_id', req.user.userId);
        if (error) {
            console.error('❌ Supabase error:', error);
            res.status(500).json({ error: 'Failed to delete layout' });
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
        data.items.every(validateInvoiceItem));
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
const findOrCreateCustomer = async (customerInfo, userId) => {
    try {
        // First, try to find existing customer
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
        // Create new customer
        const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert({
            user_id: userId,
            name: customerInfo.name.trim(),
            phone: customerInfo.phone?.trim() || null,
            address: customerInfo.address?.trim() || null
        })
            .select('id')
            .single();
        if (createError) {
            throw new Error(`Failed to create customer: ${createError.message}`);
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
            customerId = await findOrCreateCustomer(customerInfo, userId);
        }
        catch (customerError) {
            console.error('❌ Customer error:', customerError.message);
            res.status(400).json({
                error: `Customer error: ${customerError.message}`
            });
            return;
        }
        // Calculate totals
        const totals = calculateInvoiceTotals(items);
        // Create invoice
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .insert({
            user_id: userId,
            customer_id: customerId,
            layout_id: layoutId,
            form_data: formData,
            subtotal: totals.subtotal,
            tax_rate: totals.tax_rate,
            tax_amount: totals.tax_amount,
            total_amount: totals.total_amount,
            status: 'draft'
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
app.post('/api/items', authenticateToken, async (req, res) => {
    try {
        const itemData = {
            ...req.body,
            user_id: req.user.userId
        };
        const { data, error } = await supabase
            .from('items')
            .insert(itemData)
            .select()
            .single();
        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to create item' });
            return;
        }
        res.status(201).json(data);
    }
    catch (error) {
        console.error('Item creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
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
// Create a new invoice
app.post('/api/invoices', authenticateToken, async (req, res) => {
    try {
        const invoiceData = {
            ...req.body,
            user_id: req.user.userId
        };
        const { data, error } = await supabase
            .from('invoices')
            .insert(invoiceData)
            .select()
            .single();
        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to create invoice' });
            return;
        }
        res.status(201).json({ invoice: data });
    }
    catch (error) {
        console.error('Invoice creation error:', error);
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
// Start server
// In production, use a process manager like PM2 or systemd to keep the server running.
// For HTTPS, use a reverse proxy (Nginx, Caddy, Traefik) and set up SSL certificates.
app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
});
//# sourceMappingURL=index.js.map