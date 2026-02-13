const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Vehicle management endpoints
 */

/**
 * @swagger
 * /api/v1/vehicles:
 *   get:
 *     summary: Get all vehicles
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of vehicles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   license_plate:
 *                     type: string
 *                   vehicle_type:
 *                     type: string
 *                   model:
 *                     type: string
 *                   year:
 *                     type: integer
 *                   status:
 *                     type: string
 *                   fuel_level:
 *                     type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   get:
 *     summary: Get vehicle by ID
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: Vehicle data
 *       404:
 *         description: Vehicle not found
 */
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

/**
 * @swagger
 * /api/v1/vehicles:
 *   post:
 *     summary: Create new vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - license_plate
 *               - vehicle_type
 *               - model
 *               - year
 *             properties:
 *               license_plate:
 *                 type: string
 *                 example: RESCUE-001
 *               vehicle_type:
 *                 type: string
 *                 enum: [ambulance, fire_truck, police_car, rescue_truck]
 *                 example: ambulance
 *               model:
 *                 type: string
 *                 example: Ford Transit Ambulance
 *               year:
 *                 type: integer
 *                 example: 2023
 *               status:
 *                 type: string
 *                 enum: [available, in_use, maintenance, out_of_service]
 *                 example: available
 *               current_location:
 *                 type: string
 *                 example: Main Station
 *               current_latitude:
 *                 type: number
 *                 example: 13.6218
 *               current_longitude:
 *                 type: number
 *                 example: 123.1948
 *               fuel_level:
 *                 type: integer
 *                 example: 85
 *               odometer_reading:
 *                 type: integer
 *                 example: 15000
 *               equipment_list:
 *                 type: string
 *                 example: Defibrillator, Oxygen Tank, Stretcher
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 */
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   put:
 *     summary: Update vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 */
router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   delete:
 *     summary: Delete vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vehicle deleted successfully
 */
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

module.exports = router;
