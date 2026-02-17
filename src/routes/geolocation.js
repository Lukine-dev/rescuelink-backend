const express = require('express');
const axios = require('axios');

const router = express.Router();

// No auth required - public for accident reporting

/**
 * @swagger
 * tags:
 *   name: Geolocation
 *   description: Location services for accident reporting
 */

/**
 * @swagger
 * /api/v1/geolocation/reverse:
 *   post:
 *     summary: Convert GPS coordinates to human-readable address
 *     tags: [Geolocation]
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
 *                 example: 14.5995
 *               longitude:
 *                 type: number
 *                 example: 120.9842
 *     responses:
 *       200:
 *         description: Address for the GPS coordinates
 */
router.post('/reverse', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    // Validate required fields
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    // Convert to numbers
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    // Validate coordinate ranges
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.'
      });
    }
    
    console.log('Reverse geocoding GPS coordinates:', { lat, lng });
    
    // Call OpenStreetMap Nominatim API for reverse geocoding
    const response = await axios.get(
      'https://nominatim.openstreetmap.org/reverse',
      {
        params: {
          format: 'json',
          lat: lat,
          lon: lng,
          zoom: 18,           // Street-level detail
          addressdetails: 1   // Get detailed address components
        },
        headers: {
          'User-Agent': 'AccidentReportApp/1.0'
        },
        timeout: 10000  // 10 second timeout
      }
    );
    
    console.log('Nominatim API response received');
    
    // Build human-readable address
    if (response.data && response.data.address) {
      const addr = response.data.address;
      const parts = [];
      
      // Street/Road
      if (addr.road) parts.push(addr.road);
      
      // Neighborhood/Suburb
      if (addr.suburb) parts.push(addr.suburb);
      else if (addr.neighbourhood) parts.push(addr.neighbourhood);
      
      // City/Town/Municipality
      if (addr.city) parts.push(addr.city);
      else if (addr.town) parts.push(addr.town);
      else if (addr.municipality) parts.push(addr.municipality);
      
      // State/Province
      if (addr.state) parts.push(addr.state);
      
      const address = parts.join(', ');
      
      console.log('Final address:', address);
      
      return res.json({
        success: true,
        address: address || response.data.display_name,
        details: {
          road: addr.road || null,
          suburb: addr.suburb || addr.neighbourhood || null,
          city: addr.city || addr.town || addr.municipality || null,
          state: addr.state || null,
          country: addr.country || null,
          postcode: addr.postcode || null,
        },
        display_name: response.data.display_name
      });
    }
    
    // Fallback: Use display_name if detailed address not available
    if (response.data && response.data.display_name) {
      console.log('Using display_name fallback');
      return res.json({
        success: true,
        address: response.data.display_name,
        display_name: response.data.display_name
      });
    }
    
    // Last resort: Return coordinates as address
    console.log('No address found, using coordinates');
    return res.json({
      success: true,
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      fallback: true
    });
    
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    
    // Return coordinates as fallback on error
    const { latitude, longitude } = req.body;
    
    return res.json({
      success: true,
      address: `${parseFloat(latitude).toFixed(6)}, ${parseFloat(longitude).toFixed(6)}`,
      fallback: true,
      error: error.message
    });
  }
});

module.exports = router;
