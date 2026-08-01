const express = require('express');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ==================== GENERATE LINKING CODE (Rider) ====================
router.post('/generate-code', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'rider') {
      return res.status(403).json({ error: 'Only riders can generate linking codes' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    req.user.linkingCode = code;
    req.user.linkingCodeExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await req.user.save();

    res.json({ code, expiresIn: '24 hours' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== FAMILY LINKS TO RIDER ====================
router.post('/link', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'family') {
      return res.status(403).json({ error: 'Only family members can link to riders' });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Linking code required' });
    }

    const rider = await User.findOne({
      linkingCode: code,
      role: 'rider',
      linkingCodeExpiry: { $gt: new Date() },
    });

    if (!rider) {
      return res.status(404).json({ error: 'Invalid or expired linking code' });
    }

    // Already linked?
    if (req.user.linkedRider && req.user.linkedRider.toString() === rider._id.toString()) {
      return res.status(409).json({ error: 'Already linked to this rider' });
    }

    // Link family to rider (stored in MongoDB — permanent)
    req.user.linkedRider = rider._id;
    await req.user.save();

    // Add family to rider's linked family list
    if (!rider.linkedFamily.includes(req.user._id)) {
      rider.linkedFamily.push(req.user._id);
      await rider.save();
    }

    // Clear linking code
    rider.linkingCode = null;
    rider.linkingCodeExpiry = null;
    await rider.save();

    res.json({
      message: 'Successfully linked to rider',
      rider: { username: rider.username, email: rider.email, vehicle: rider.vehicle },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== UNLINK FAMILY FROM RIDER ====================
router.post('/unlink', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'family') {
      // Family unlinking themselves
      const riderId = req.user.linkedRider;
      if (!riderId) {
        return res.status(400).json({ error: 'Not linked to any rider' });
      }

      await User.findByIdAndUpdate(riderId, {
        $pull: { linkedFamily: req.user._id },
      });

      req.user.linkedRider = null;
      await req.user.save();

      return res.json({ message: 'Unlinked from rider' });
    }

    if (req.user.role === 'rider') {
      // Rider removing a family member
      const { familyId } = req.body;
      if (!familyId) {
        return res.status(400).json({ error: 'Family ID required' });
      }

      await User.findByIdAndUpdate(familyId, {
        linkedRider: null,
      });

      await User.findByIdAndUpdate(req.user._id, {
        $pull: { linkedFamily: familyId },
      });

      return res.json({ message: 'Family member removed' });
    }

    res.status(403).json({ error: 'Unknown role' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== GET LINKED FAMILY (Rider View) ====================
router.get('/linked-family', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'rider') {
      return res.status(403).json({ error: 'Only riders can view linked family' });
    }

    const user = await User.findById(req.user._id).populate('linkedFamily', 'username email phone');
    res.json({ family: user.linkedFamily });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== GET RIDER STATUS (Works for both) ====================
router.get('/rider-status', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'rider') {
      const rider = await User.findById(req.user._id)
        .select('username email vehicle sensorStatus currentAlert alertHistory');
      if (!rider) return res.status(404).json({ error: 'Rider not found' });
      return res.json({ rider });
    }

    if (req.user.role === 'family') {
      if (!req.user.linkedRider) {
        return res.status(404).json({ error: 'Not linked to any rider' });
      }

      const rider = await User.findById(req.user.linkedRider)
        .select('username email vehicle sensorStatus currentAlert alertHistory');

      if (!rider) {
        return res.status(404).json({ error: 'Rider not found' });
      }

      return res.json({
        rider: {
          _id: rider._id,
          username: rider.username,
          email: rider.email,
          vehicle: rider.vehicle,
          sensorStatus: rider.sensorStatus,
          currentAlert: rider.currentAlert,
          alertHistory: rider.alertHistory || [],
        },
      });
    }

    res.status(403).json({ error: 'Unknown role' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
