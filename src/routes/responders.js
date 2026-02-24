const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Responders
 *   description: Management of emergency responders
 */

/**
 * @swagger
 * /api/v1/responders:
 *   get:
 *     summary: Get all responders
 *     tags: [Responders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of responders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Responder'
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('responders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/v1/responders:
 *   post:
 *     summary: Create a new responder (Admin only)
 *     tags: [Responders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Responder'
 *           example:
 *             name: "Jane Firefighter"
 *             type: "firefighter"
 *             contact_number: "09181112222"
 *             status: "available"
 *     responses:
 *       201:
 *         description: Responder created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Responder'
 *       403:
 *         description: Forbidden - Admin only
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const { data, error } = await supabase
      .from('responders')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/v1/responders/{id}:
 *   put:
 *     summary: Update a responder
 *     tags: [Responders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Responder ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Responder'
 *           example:
 *             status: "busy"
 *             contact_number: "09199990000"
 *     responses:
 *       200:
 *         description: Responder updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Responder'
 *       404:
 *         description: Responder not found
 *       500:
 *         description: Server error
 */
router.put('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('responders')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/v1/responders/{id}:
 *   delete:
 *     summary: Delete a responder (Admin only)
 *     tags: [Responders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Responder ID
 *     responses:
 *       200:
 *         description: Responder deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Responder deleted
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Responder not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const { error } = await supabase
      .from('responders')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Responder deleted' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;