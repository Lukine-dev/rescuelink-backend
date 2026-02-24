const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Crash Detection
 *   description: Automatic crash detection from mobile sensors
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CrashEvent:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         event_type:
 *           type: string
 *           example: AUTO_CRASH
 *         latitude:
 *           type: number
 *           format: float
 *         longitude:
 *           type: number
 *           format: float
 *         impact_force:
 *           type: number
 *           format: float
 *           nullable: true
 *         sensitivity_level:
 *           type: string
 *           nullable: true
 *         stillness_duration:
 *           type: integer
 *           nullable: true
 *         movement_detected:
 *           type: boolean
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [pending, responding, resolved, cancelled]
 *           default: pending
 *         triggered_at:
 *           type: string
 *           format: date-time
 *         sent_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         acknowledged_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         resolved_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         device_battery:
 *           type: integer
 *           nullable: true
 *         network_type:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             first_name:
 *               type: string
 *             last_name:
 *               type: string
 *
 *     CrashEventUpdate:
 *       type: object
 *       properties:
 *         latitude:
 *           type: number
 *           format: float
 *         longitude:
 *           type: number
 *           format: float
 *         impact_force:
 *           type: number
 *           format: float
 *           nullable: true
 *         sensitivity_level:
 *           type: string
 *           nullable: true
 *         stillness_duration:
 *           type: integer
 *           nullable: true
 *         movement_detected:
 *           type: boolean
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [pending, responding, resolved, cancelled]
 *         sent_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         acknowledged_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         resolved_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         device_battery:
 *           type: integer
 *           nullable: true
 *         network_type:
 *           type: string
 *           nullable: true
 */

/**
 * @swagger
 * /api/v1/crash:
 *   post:
 *     summary: Automatic crash detection trigger
 *     description: Creates a crash event when a mobile device detects a collision
 *     tags: [Crash Detection]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 format: float
 *                 description: Latitude of the crash location
 *                 example: 14.5995
 *               longitude:
 *                 type: number
 *                 format: float
 *                 description: Longitude of the crash location
 *                 example: 120.9842
 *               impact_force:
 *                 type: number
 *                 format: float
 *                 description: Impact force measured by accelerometer (g‑force)
 *                 example: 8.5
 *               device_battery:
 *                 type: integer
 *                 description: Battery level at time of crash (percentage)
 *                 example: 87
 *               network_type:
 *                 type: string
 *                 description: Type of network connection (wifi, 4g, 5g, etc.)
 *                 example: "4g"
 *     responses:
 *       201:
 *         description: Crash event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Crash event recorded
 *                 event:
 *                   $ref: '#/components/schemas/CrashEvent'
 *       400:
 *         description: Missing required fields (latitude/longitude)
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      impact_force,
      device_battery,
      network_type
    } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        message: 'Latitude and longitude are required'
      });
    }

    const crashEvent = {
      user_id: req.user.id,
      event_type: 'AUTO_CRASH',
      latitude,
      longitude,
      impact_force: impact_force || null,
      device_battery: device_battery || null,
      network_type: network_type || null,
      status: 'pending',
      triggered_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('crash_events')
      .insert([crashEvent])
      .select(`
        *,
        user:user_id(id, first_name, last_name)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Crash event recorded',
      event: data
    });

  } catch (error) {
    console.error('Crash detection error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/v1/crash:
 *   get:
 *     summary: Get crash events
 *     description: Retrieve crash events with optional filters
 *     tags: [Crash Detection]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, responding, resolved, cancelled]
 *         description: Filter by event status
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date (ISO format, e.g., 2025-01-01T00:00:00Z) – filters on triggered_at
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date (ISO format) – filters on triggered_at
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of crash events with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CrashEvent'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     returned:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const { status, from, to, limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from('crash_events')
      .select(`
        *,
        user:user_id(id, first_name, last_name)
      `, { count: 'exact' })
      .eq('event_type', 'AUTO_CRASH')
      .order('triggered_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (from) {
      query = query.gte('triggered_at', from);
    }
    if (to) {
      query = query.lte('triggered_at', to);
    }

    if (req.user.role === 'user') {
      query = query.eq('user_id', req.user.id);
    }

    const parsedLimit = parseInt(limit);
    const parsedOffset = parseInt(offset);
    query = query.range(parsedOffset, parsedOffset + parsedLimit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      data,
      pagination: {
        total: count,
        limit: parsedLimit,
        offset: parsedOffset,
        returned: data.length
      }
    });

  } catch (error) {
    console.error('Get crash events error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/v1/crash/{id}:
 *   put:
 *     summary: Fully update a crash event
 *     description: Replace all updatable fields of a crash event. Regular users can only update their own events.
 *     tags: [Crash Detection]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the crash event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrashEventUpdate'
 *     responses:
 *       200:
 *         description: Crash event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Crash event updated
 *                 event:
 *                   $ref: '#/components/schemas/CrashEvent'
 *       403:
 *         description: Forbidden – you do not own this event
 *       404:
 *         description: Crash event not found
 *       500:
 *         description: Server error
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // First, fetch the existing event to check ownership
    const { data: existing, error: fetchError } = await supabase
      .from('crash_events')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ message: 'Crash event not found' });
    }

    // Authorization: user can only update if owner or not a regular user
    if (req.user.role === 'user' && existing.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to update this event' });
    }

    // Remove fields that should never be updated directly
    delete updates.id;
    delete updates.user_id;
    delete updates.event_type;
    delete updates.created_at;
    delete updates.updated_at;
    delete updates.triggered_at;   // triggered_at is set once at creation

    // Perform the update
    const { data, error } = await supabase
      .from('crash_events')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        user:user_id(id, first_name, last_name)
      `)
      .single();

    if (error) throw error;

    res.json({
      message: 'Crash event updated',
      event: data
    });

  } catch (error) {
    console.error('Update crash event error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/v1/crash/{id}:
 *   patch:
 *     summary: Partially update a crash event
 *     description: Update only the provided fields of a crash event. Regular users can only update their own events.
 *     tags: [Crash Detection]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the crash event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrashEventUpdate'
 *     responses:
 *       200:
 *         description: Crash event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Crash event updated
 *                 event:
 *                   $ref: '#/components/schemas/CrashEvent'
 *       403:
 *         description: Forbidden – you do not own this event
 *       404:
 *         description: Crash event not found
 *       500:
 *         description: Server error
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // First, fetch the existing event to check ownership
    const { data: existing, error: fetchError } = await supabase
      .from('crash_events')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ message: 'Crash event not found' });
    }

    // Authorization: user can only update if owner or not a regular user
    if (req.user.role === 'user' && existing.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to update this event' });
    }

    // Remove immutable fields
    delete updates.id;
    delete updates.user_id;
    delete updates.event_type;
    delete updates.created_at;
    delete updates.updated_at;
    delete updates.triggered_at;

    // Perform the update
    const { data, error } = await supabase
      .from('crash_events')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        user:user_id(id, first_name, last_name)
      `)
      .single();

    if (error) throw error;

    res.json({
      message: 'Crash event updated',
      event: data
    });

  } catch (error) {
    console.error('Patch crash event error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/v1/crash/{id}:
 *   delete:
 *     summary: Delete a crash event
 *     description: Permanently remove a crash event. Regular users can only delete their own events.
 *     tags: [Crash Detection]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the crash event
 *     responses:
 *       200:
 *         description: Crash event deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Crash event deleted
 *       403:
 *         description: Forbidden – you do not own this event
 *       404:
 *         description: Crash event not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First, fetch the existing event to check ownership
    const { data: existing, error: fetchError } = await supabase
      .from('crash_events')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ message: 'Crash event not found' });
    }

    // Authorization: user can only delete if owner or not a regular user
    if (req.user.role === 'user' && existing.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to delete this event' });
    }

    const { error } = await supabase
      .from('crash_events')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Crash event deleted' });

  } catch (error) {
    console.error('Delete crash event error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;