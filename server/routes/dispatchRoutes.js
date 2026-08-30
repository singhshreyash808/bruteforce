const express = require('express');
const router = express.Router();
const PatrolUnit = require('../models/PatrolUnit');
const Dispatch = require('../models/Dispatch');
const { createDispatchRecord, updateDispatchStatus } = require('../services/dispatchService');
const { optionalAuth, authenticateToken } = require('../middleware/auth');
const { Op } = require('sequelize');

/**
 * POST /api/dispatches
 * Dispatch a sector mobile patrol unit for a predicted hotspot / incident
 */
router.post('/dispatches', optionalAuth, async (req, res) => {
  try {
    const {
      incidentId,
      predictionId,
      location,
      state,
      district,
      latitude,
      longitude,
      riskLevel,
      threatScore,
      crimeCategory,
      notes
    } = req.body;

    if (!location && !latitude && !district) {
      return res.status(400).json({ error: 'Location or valid coordinates are required for patrol dispatch.' });
    }

    const dispatchedBy = req.user ? req.user.userId : (req.body.dispatchedBy || 'OFFICER-ADMIN');
    const clientIp = req.ip || req.connection.remoteAddress;

    const result = await createDispatchRecord({
      incidentId,
      predictionId,
      location,
      state,
      district,
      latitude,
      longitude,
      riskLevel,
      threatScore,
      crimeCategory,
      notes,
      dispatchedBy,
      clientIp
    });

    if (result.isDuplicate) {
      return res.status(200).json({
        success: true,
        isDuplicate: true,
        message: result.message,
        dispatch: result.dispatch
      });
    }

    return res.status(201).json({
      success: true,
      isDuplicate: false,
      message: result.message,
      dispatch: result.dispatch
    });
  } catch (err) {
    console.error('Dispatch creation error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error during patrol dispatch.' });
  }
});

/**
 * GET /api/dispatches
 * Query all dispatches
 */
router.get('/dispatches', async (req, res) => {
  try {
    const { incidentId, status, limit = 50, page = 1 } = req.query;
    const where = {};

    if (incidentId) where.incidentId = incidentId;
    if (status && status !== 'All') where.dispatchStatus = status;

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const { count, rows } = await Dispatch.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset
    });

    return res.json({
      total: count,
      page: parseInt(page, 10),
      dispatches: rows
    });
  } catch (err) {
    console.error('Error fetching dispatches:', err);
    return res.status(500).json({ error: 'Failed to retrieve dispatch records.' });
  }
});

/**
 * GET /api/dispatches/incident/:incidentId/active
 * Get active dispatch for a specific incident
 */
router.get('/dispatches/incident/:incidentId/active', async (req, res) => {
  try {
    const { incidentId } = req.params;
    const activeDispatch = await Dispatch.findOne({
      where: {
        incidentId,
        dispatchStatus: {
          [Op.in]: ['PENDING', 'DISPATCHED', 'ACCEPTED', 'EN_ROUTE', 'ON_SCENE']
        }
      },
      order: [['createdAt', 'DESC']]
    });

    if (!activeDispatch) {
      return res.json({ active: false, dispatch: null });
    }

    return res.json({ active: true, dispatch: activeDispatch });
  } catch (err) {
    console.error('Error fetching active dispatch:', err);
    return res.status(500).json({ error: 'Failed to check active dispatch.' });
  }
});

/**
 * GET /api/dispatches/:id
 * Get single dispatch details
 */
router.get('/dispatches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dispatch = await Dispatch.findOne({
      where: {
        [Op.or]: [{ id: isNaN(id) ? -1 : parseInt(id, 10) }, { dispatchId: id }]
      }
    });

    if (!dispatch) {
      return res.status(404).json({ error: 'Dispatch record not found.' });
    }

    return res.json(dispatch);
  } catch (err) {
    console.error('Error fetching dispatch details:', err);
    return res.status(500).json({ error: 'Failed to retrieve dispatch.' });
  }
});

/**
 * PATCH /api/dispatches/:id/status
 * PUT /api/dispatches/:id/status
 * Transition dispatch lifecycle status
 */
const handleStatusUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'New dispatch status is required.' });
    }

    const updatedBy = req.user ? req.user.userId : (req.body.updatedBy || 'OFFICER-ADMIN');
    const clientIp = req.ip || req.connection.remoteAddress;

    const updated = await updateDispatchStatus(id, status, notes, updatedBy, clientIp);
    return res.json({
      success: true,
      message: `Dispatch status successfully updated to ${status}`,
      dispatch: updated
    });
  } catch (err) {
    console.error('Error updating dispatch status:', err);
    return res.status(400).json({ error: err.message || 'Failed to update dispatch status.' });
  }
};

router.patch('/dispatches/:id/status', optionalAuth, handleStatusUpdate);
router.put('/dispatches/:id/status', optionalAuth, handleStatusUpdate);

/**
 * GET /api/patrol-units
 * List all patrol units with telemetry
 */
router.get('/patrol-units', async (req, res) => {
  try {
    const { state, district, status } = req.query;
    const where = {};
    if (state && state !== 'All') where.state = state;
    if (district && district !== 'All') where.district = district;
    if (status && status !== 'All') where.status = status;

    const units = await PatrolUnit.findAll({
      where,
      order: [['unitCode', 'ASC']]
    });

    return res.json(units);
  } catch (err) {
    console.error('Error fetching patrol units:', err);
    return res.status(500).json({ error: 'Failed to retrieve patrol units.' });
  }
});

/**
 * GET /api/patrol-units/available
 * List available patrol units
 */
router.get('/patrol-units/available', async (req, res) => {
  try {
    const units = await PatrolUnit.findAll({
      where: {
        status: 'AVAILABLE',
        isAvailable: true
      },
      order: [['unitCode', 'ASC']]
    });
    return res.json(units);
  } catch (err) {
    console.error('Error fetching available patrol units:', err);
    return res.status(500).json({ error: 'Failed to retrieve available units.' });
  }
});

module.exports = router;
