// routes/emergencyContacts.js
const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Helper to check if the current user owns the contact or is an admin
 */
const canAccessContact = async (contactId, userId, userRole) => {
  if (userRole === 'admin') return true; // Admin can access any contact

  // Fetch the contact and verify ownership
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('user_id')
    .eq('id', contactId)
    .single();

  if (error || !data) return false;
  return data.user_id === userId;
};

/**
 * Helper to ensure only one primary contact per user
 * Sets all other contacts of the same user to is_primary = false
 */
const clearOtherPrimaryContacts = async (userId, excludeContactId = null) => {
  let query = supabase
    .from('emergency_contacts')
    .update({ is_primary: false })
    .eq('user_id', userId)
    .eq('is_primary', true);

  if (excludeContactId) {
    query = query.neq('id', excludeContactId);
  }

  const { error } = await query;
  if (error) throw error;
};

/**
 * @swagger
 * tags:
 *   name: Emergency Contacts
 *   description: Manage emergency contacts for users
 */

/**
 * @swagger
 * /api/v1/emergency-contacts:
 *   get:
 *     summary: List emergency contacts
 *     tags: [Emergency Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: (Admin only) Get contacts for a specific user
 *     responses:
 *       200:
 *         description: List of emergency contacts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EmergencyContact'
 */
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    let targetUserId = req.user.id;

    // Admin can request contacts for another user
    if (userId && req.user.role === 'admin') {
      targetUserId = parseInt(userId);
    } else if (userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', targetUserId)
      .order('is_primary', { ascending: false }) // primary first
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('List contacts error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

/**
 * @swagger
 * /api/v1/emergency-contacts:
 *   post:
 *     summary: Create a new emergency contact
 *     tags: [Emergency Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - relationship
 *               - phone_number
 *             properties:
 *               name:
 *                 type: string
 *               relationship:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               alternate_phone:
 *                 type: string
 *               email:
 *                 type: string
 *               notes:
 *                 type: string
 *               is_primary:
 *                 type: boolean
 *               user_id:
 *                 type: integer
 *                 description: (Admin only) Create contact for another user
 *     responses:
 *       201:
 *         description: Contact created
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      relationship,
      phone_number,
      alternate_phone,
      email,
      notes,
      is_primary = false,
      user_id,
    } = req.body;

    // Validate required fields
    if (!name || !relationship || !phone_number) {
      return res.status(400).json({ message: 'Name, relationship and phone number are required' });
    }

    // Determine which user this contact belongs to
    let ownerId = req.user.id;
    if (user_id && req.user.role === 'admin') {
      ownerId = user_id;
    } else if (user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Verify that the target user exists (optional but good practice)
    const { data: userExists, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', ownerId)
      .single();

    if (userError || !userExists) {
      return res.status(400).json({ message: 'User does not exist' });
    }

    // If this contact is primary, clear other primary contacts for this user first
    if (is_primary) {
      await clearOtherPrimaryContacts(ownerId);
    }

    // Insert the new contact
    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert([{
        user_id: ownerId,
        name,
        relationship,
        phone_number,
        alternate_phone,
        email,
        notes,
        is_primary,
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

/**
 * @swagger
 * /api/v1/emergency-contacts/{id}:
 *   get:
 *     summary: Get a specific emergency contact
 *     tags: [Emergency Contacts]
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
 *         description: Contact data
 *       404:
 *         description: Contact not found
 */
router.get('/:id', async (req, res) => {
  try {
    const contactId = parseInt(req.params.id);

    // Check access permissions
    const allowed = await canAccessContact(contactId, req.user.id, req.user.role);
    if (!allowed) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

/**
 * @swagger
 * /api/v1/emergency-contacts/{id}:
 *   put:
 *     summary: Update an emergency contact
 *     tags: [Emergency Contacts]
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
 *             properties:
 *               name:
 *                 type: string
 *               relationship:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               alternate_phone:
 *                 type: string
 *               email:
 *                 type: string
 *               notes:
 *                 type: string
 *               is_primary:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Contact updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Contact not found
 */
router.put('/:id', async (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const {
      name,
      relationship,
      phone_number,
      alternate_phone,
      email,
      notes,
      is_primary,
    } = req.body;

    // First, fetch the current contact to verify ownership and get user_id
    const { data: existing, error: fetchError } = await supabase
      .from('emergency_contacts')
      .select('user_id, is_primary')
      .eq('id', contactId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && existing.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Build update object (only provided fields)
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (relationship !== undefined) updates.relationship = relationship;
    if (phone_number !== undefined) updates.phone_number = phone_number;
    if (alternate_phone !== undefined) updates.alternate_phone = alternate_phone;
    if (email !== undefined) updates.email = email;
    if (notes !== undefined) updates.notes = notes;
    if (is_primary !== undefined) updates.is_primary = is_primary;

    // If setting this contact as primary, first clear other primary contacts for this user
    if (is_primary === true) {
      await clearOtherPrimaryContacts(existing.user_id, contactId);
    }

    const { data, error } = await supabase
      .from('emergency_contacts')
      .update(updates)
      .eq('id', contactId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

/**
 * @swagger
 * /api/v1/emergency-contacts/{id}:
 *   delete:
 *     summary: Delete an emergency contact
 *     tags: [Emergency Contacts]
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
 *         description: Contact deleted
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Contact not found
 */
router.delete('/:id', async (req, res) => {
  try {
    const contactId = parseInt(req.params.id);

    // Fetch contact to verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('emergency_contacts')
      .select('user_id')
      .eq('id', contactId)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && existing.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', contactId);

    if (error) throw error;

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

module.exports = router;