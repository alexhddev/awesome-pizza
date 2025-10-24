import express from 'express';
import path from 'path';
import { menu_entry, order } from '../model/Model';
import { dailyMenu, findOrderById, addOrder, updateOrderById } from './database';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from ui directory
app.use(express.static(path.join(__dirname, '../ui')));

// CORS middleware for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// API Routes

// GET /api/daily-menu - Return the daily menu
app.get('/api/daily-menu', (req, res) => {
    try {
        res.status(200).json({
            success: true,
            data: dailyMenu,
            message: 'Daily menu retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to retrieve daily menu'
        });
    }
});

// GET /api/orders/:id - Get order by ID
app.get('/api/orders/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Bad request',
                message: 'Order ID is required'
            });
        }

        const order = findOrderById(id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Not found',
                message: `Order with ID '${id}' not found`
            });
        }

        res.status(200).json({
            success: true,
            data: order,
            message: 'Order retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to retrieve order'
        });
    }
});

// POST /api/orders - Create a new order
app.post('/api/orders', (req, res) => {
    try {
        const { sender, contents } = req.body;

        // Validation
        if (!sender || typeof sender !== 'string' || sender.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Bad request',
                message: 'Order sender is required and must be a non-empty string'
            });
        }

        if (!contents || !Array.isArray(contents) || contents.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad request',
                message: 'Order contents are required and must be a non-empty array'
            });
        }

        // Validate each item in contents
        for (const item of contents) {
            if (!item.name || typeof item.name !== 'string' || item.name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'Each order item must have a valid name'
                });
            }

            if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'Each order item must have a valid quantity (positive number)'
                });
            }
        }

        // Create new order with default status
        const orderData = {
            sender: sender.trim(),
            status: 'RECEIVED' as const,
            contents: contents
        };

        const newOrder = addOrder(orderData);

        res.status(201).json({
            success: true,
            data: newOrder,
            message: 'Order created successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to create order'
        });
    }
});

// PUT /api/orders/:id - Update an existing order
app.put('/api/orders/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { sender, status, contents } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Bad request',
                message: 'Order ID is required'
            });
        }

        // Check if order exists
        const existingOrder = findOrderById(id);
        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                error: 'Not found',
                message: `Order with ID '${id}' not found`
            });
        }

        // Validate optional fields if provided
        const updateData: Partial<order> = {};

        if (sender !== undefined) {
            if (typeof sender !== 'string' || sender.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'Order sender must be a non-empty string'
                });
            }
            updateData.sender = sender.trim();
        }

        if (status !== undefined) {
            const validStatuses = ['RECEIVED', 'DELIVERING', 'DELIVERED', 'CANCELED'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: `Status must be one of: ${validStatuses.join(', ')}`
                });
            }
            updateData.status = status;
        }

        if (contents !== undefined) {
            if (!Array.isArray(contents) || contents.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Bad request',
                    message: 'Order contents must be a non-empty array'
                });
            }

            // Validate each item in contents
            for (const item of contents) {
                if (!item.name || typeof item.name !== 'string' || item.name.trim() === '') {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad request',
                        message: 'Each order item must have a valid name'
                    });
                }

                if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bad request',
                        message: 'Each order item must have a valid quantity (positive number)'
                    });
                }
            }
            updateData.contents = contents;
        }

        // Update the order
        const updatedOrder = updateOrderById(id, updateData);

        if (!updatedOrder) {
            return res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to update order'
            });
        }

        res.status(200).json({
            success: true,
            data: updatedOrder,
            message: 'Order updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to update order'
        });
    }
});

// Serve the UI on root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../ui/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🍕 Awesome Pizza API server running on port ${PORT}`);
    console.log(`🌐 Web UI available at http://localhost:${PORT}`);
});

export default app;