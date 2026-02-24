const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: SOS
 *   description: Manual SOS request management
 */

/**
 * @swagger
 * /api/v1/sos:
 *   post:
 *     summary: Trigger manual SOS
 *     tags: [SOS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - latitude
 *               - longitude
 *             properties:
 *               type:
 *                 type: string
 *                 example: medical
 *               description:
 *                 type: string
 *                 example: Person unconscious
 *               latitude:
 *                 type: number
 *                 example: 14.5547
 *               longitude:
 *                 type: number
 *                 example: 121.0244
 *     responses:
 *       201:
 *         description: SOS sent successfully
 */
router.post('/', async (req, res) => {
  try {
    const { type, description, latitude, longitude } = req.body;

    // Validation
    if (!type || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: 'Missing required fields (type, latitude, longitude)',
      });
    }

    if (
      typeof latitude !== 'number' ||
      latitude < -90 ||
      latitude > 90 ||
      typeof longitude !== 'number' ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        message: 'Invalid latitude or longitude values',
      });
    }

    const sosData = {
      user_id: req.user.id,
      type,
      description: description?.trim() || null,
      latitude,
      longitude,
      status: 'pending',
      triggered_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('sos_requests')
      .insert([sosData])
      .select(`
        *,
        user:user_id(id, first_name, last_name, email)
      `)
      .single();

    if (error) throw error;

    // OPTIONAL: Call auto-dispatch logic here
    // await notifyNearestResponders(data);

    res.status(201).json({
      message: 'SOS sent successfully',
      sos: data,
    });

  } catch (error) {
    console.error('Create SOS error:', error);
    res.status(500).json({
      message: error.message || 'Server error',
    });
  }
});


/**
 * @swagger
 * /api/v1/sos:
 *   get:
 *     summary: Get SOS history
 *     tags: [SOS]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of SOS requests
 */
router.get('/', async (req, res) => {
  try {
    const { per_page = 15 } = req.query;

    let query = supabase
      .from('sos_requests')
      .select(`
        *,
        user:user_id(id, first_name, last_name, email)
      `)
      .order('triggered_at', { ascending: false });

    // Regular users only see their own SOS
    if (req.user.role === 'user') {
      query = query.eq('user_id', req.user.id);
    }

    const { data, error } = await query.limit(per_page);

    if (error) throw error;

    res.json(data);

  } catch (error) {
    console.error('Get SOS history error:', error);
    res.status(500).json({
      message: error.message || 'Server error',
    });
  }
});

module.exports = router;
