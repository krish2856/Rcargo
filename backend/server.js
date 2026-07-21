require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const { Op } = require('sequelize');

const { initDatabase, sequelize, Branch, User, News, Booking, saveToDbJson } = require('./db');

// use iLike for postgres, like for sqlite
const likeOp = sequelize.options.dialect === 'postgres' ? Op.iLike : Op.like;

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  ws.on('close', () => console.log('WebSocket client disconnected'));
});

// Broadcast helper for real-time updates
const broadcastDashboardUpdate = () => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'REFRESH_DASHBOARD' }));
    }
  });
};

app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// auth
app.post('/api/auth/login', async (req, res) => {
  const { branchCode, username, password, loginType } = req.body;
  
  if (!branchCode || !username || !password || !loginType) {
    return res.status(400).json({ success: false, message: 'All login fields are required' });
  }

  try {
    const user = await User.findOne({
      where: {
        branchCode: { [likeOp]: branchCode },
        username: { [likeOp]: username },
        password: password,
        type: loginType
      }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // mock token for now
    const token = Buffer.from(`${user.branchCode}:${user.username}:${Date.now()}`).toString('base64');
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        username: user.username,
        branchCode: user.branchCode,
        type: user.type,
        name: user.name
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'server error' });
  }
});

// get branches
app.get('/api/branches', async (req, res) => {
  try {
    const branches = await Branch.findAll({
      order: [['name', 'ASC']]
    });
    res.json(branches);
  } catch (err) {
    console.error('Error fetching branches:', err);
    res.status(500).json({ success: false, message: 'Database error fetching branches list' });
  }
});

// add branch
app.post('/api/branches', async (req, res) => {
  const { code, name } = req.body;
  if (!code || !name) {
    return res.status(400).json({ success: false, message: 'Branch code and name are required' });
  }

  try {
    const cleanCode = code.toLowerCase().trim();
    const existing = await Branch.findByPk(cleanCode);
    if (existing) {
      return res.status(400).json({ success: false, message: `Branch with code "${cleanCode}" already exists.` });
    }

    const branch = await Branch.create({
      code: cleanCode,
      name: name.trim()
    });

    await saveToDbJson();

    res.status(201).json({ success: true, message: 'Branch created successfully', branch });
  } catch (err) {
    console.error('Error creating branch:', err);
    res.status(500).json({ success: false, message: 'Failed to create branch.' });
  }
});

// create user
app.post('/api/users', async (req, res) => {
  const { branchCode, name, username, password, type } = req.body;
  if (!branchCode || !name || !username || !password || !type) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const cleanUsername = username.trim();
    const cleanBranchCode = branchCode.toLowerCase().trim();

    // Check unique username + branchCode combination
    const existing = await User.findOne({
      where: {
        username: { [likeOp]: cleanUsername },
        branchCode: { [likeOp]: cleanBranchCode }
      }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Username already taken for this branch' });
    }

    const user = await User.create({
      branchCode: cleanBranchCode,
      name: name.trim(),
      username: cleanUsername,
      password,
      type
    });

    await saveToDbJson();

    res.status(201).json({ success: true, message: 'Agent account created successfully', user: { username: user.username, name: user.name, branchCode: user.branchCode } });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ success: false, message: 'Failed to create agent account.' });
  }
});

// get users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['username', 'ASC']]
    });
    res.json(users.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      branchCode: u.branchCode,
      type: u.type
    })));
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: 'Database error fetching users list' });
  }
});

// edit user
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.name = name.trim();
    await user.save();
    await saveToDbJson();
    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

// delete user
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Prevent deleting the main admin
    if (user.username === 'admin' && user.type === 'company') {
      return res.status(403).json({ success: false, message: 'Cannot delete the main admin account' });
    }
    await user.destroy();
    await saveToDbJson();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// change pass
app.post('/api/users/change-password', async (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) {
    return res.status(400).json({ success: false, message: 'User ID and new password are required' });
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    await saveToDbJson();

    res.json({ success: true, message: `Password for "${user.username}" updated successfully` });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});


// get news
app.get('/api/news', async (req, res) => {
  try {
    const news = await News.findAll({
      order: [['date', 'DESC'], ['id', 'DESC']]
    });
    res.json(news);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    res.status(500).json({ success: false, message: 'Database error fetching announcements' });
  }
});

// new booking
app.post('/api/bookings', async (req, res) => {
  const { originBranch, destinationBranch, consignor, consignee, parcel, billing } = req.body;

  if (!originBranch || !destinationBranch || !consignor || !consignee || !parcel || !billing) {
    return res.status(400).json({ success: false, message: 'Missing required booking components' });
  }

  try {
    const result = await sequelize.transaction(async (t) => {
      const currentYear = new Date().getFullYear();
      
      // get last sequence number to generate next one
      const lastBooking = await Booking.findOne({
        where: {
          lrNumber: {
            [Op.like]: `LR-${currentYear}-%`
          }
        },
        order: [['lrNumber', 'DESC']],
        lock: true, // Apply record lock within the transaction
        transaction: t
      });

      let nextSeq = 1;
      if (lastBooking) {
        const parts = lastBooking.lrNumber.split('-');
        const lastSeq = parseInt(parts[2], 10);
        if (!isNaN(lastSeq)) {
          nextSeq = lastSeq + 1;
        }
      }

      const paddedSeq = String(nextSeq).padStart(4, '0');
      const lrNumber = `LR-${currentYear}-${paddedSeq}`;

      const newBooking = await Booking.create({
        lrNumber,
        bookingDate: new Date(),
        originBranch,
        destinationBranch,
        consignorName: consignor.name || '',
        consignorMobile: consignor.mobile || '',
        consignorAddress: consignor.address || '',
        consigneeName: consignee.name || '',
        consigneeMobile: consignee.mobile || '',
        consigneeAddress: consignee.address || '',
        articleType: parcel.articleType || 'Box',
        qty: parseInt(parcel.qty, 10) || 1,
        declaredValue: parseFloat(parcel.declaredValue) || 0,
        actualWeight: parseFloat(parcel.actualWeight) || 0,
        chargedWeight: parseFloat(parcel.chargedWeight) || 0,
        description: parcel.description || '',
        basicFreight: parseFloat(billing.basicFreight) || 0,
        handlingCharges: parseFloat(billing.handlingCharges) || 0,
        deliveryCharges: parseFloat(billing.deliveryCharges) || 0,
        docketFee: parseFloat(billing.docketFee) || 0,
        surcharge: parseFloat(billing.surcharge) || 0,
        gst: parseFloat(billing.gst) || 0,
        grandTotal: parseFloat(billing.grandTotal) || 0,
        paymentMode: billing.paymentMode || 'Paid',
        bookedBy: req.body.bookedBy || 'agent',
        status: 'Booked'
      }, { transaction: t });

      return newBooking;
    });

    // map db fields to nested object
    const responseData = {
      lrNumber: result.lrNumber,
      bookingDate: result.bookingDate,
      originBranch: result.originBranch,
      destinationBranch: result.destinationBranch,
      consignor: {
        name: result.consignorName,
        mobile: result.consignorMobile,
        address: result.consignorAddress
      },
      consignee: {
        name: result.consigneeName,
        mobile: result.consigneeMobile,
        address: result.consigneeAddress
      },
      parcel: {
        articleType: result.articleType,
        qty: result.qty,
        declaredValue: result.declaredValue,
        actualWeight: result.actualWeight,
        chargedWeight: result.chargedWeight,
        description: result.description
      },
      billing: {
        basicFreight: result.basicFreight,
        handlingCharges: result.handlingCharges,
        deliveryCharges: result.deliveryCharges,
        docketFee: result.docketFee,
        surcharge: result.surcharge,
        gst: result.gst,
        grandTotal: result.grandTotal,
        paymentMode: result.paymentMode
      },
      bookedBy: result.bookedBy,
      status: result.status
    };

    await saveToDbJson();

    // Broadcast update to all clients
    broadcastDashboardUpdate();

    res.status(201).json({ success: true, message: 'Booking saved successfully', booking: responseData });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
});

// get bookings
app.get('/api/bookings', async (req, res) => {
  const { branchCode, search } = req.query;
  
  let whereClause = {};

  // Apply branch filter (except for Corporate Admins)
  if (branchCode && branchCode.toLowerCase() !== 'corp') {
    whereClause[Op.or] = [
      { originBranch: { [likeOp]: branchCode } },
      { destinationBranch: { [likeOp]: branchCode } }
    ];
  }

  // Apply search keyword filter
  if (search) {
    const searchClause = {
      [Op.or]: [
        { lrNumber: { [likeOp]: `%${search}%` } },
        { consignorName: { [likeOp]: `%${search}%` } },
        { consignorMobile: { [likeOp]: `%${search}%` } },
        { consigneeName: { [likeOp]: `%${search}%` } },
        { consigneeMobile: { [likeOp]: `%${search}%` } }
      ]
    };

    // Safely combine search constraints with branch constraints
    if (whereClause[Op.or]) {
      whereClause = {
        [Op.and]: [
          { [Op.or]: whereClause[Op.or] },
          searchClause
        ]
      };
    } else {
      whereClause = searchClause;
    }
  }

  try {
    const bookings = await Booking.findAll({
      where: whereClause,
      order: [['bookingDate', 'DESC']]
    });

    const responseData = bookings.map(b => ({
      lrNumber: b.lrNumber,
      bookingDate: b.bookingDate,
      originBranch: b.originBranch,
      destinationBranch: b.destinationBranch,
      consignor: {
        name: b.consignorName,
        mobile: b.consignorMobile,
        address: b.consignorAddress
      },
      consignee: {
        name: b.consigneeName,
        mobile: b.consigneeMobile,
        address: b.consigneeAddress
      },
      parcel: {
        articleType: b.articleType,
        qty: b.qty,
        declaredValue: b.declaredValue,
        actualWeight: b.actualWeight,
        chargedWeight: b.chargedWeight,
        description: b.description
      },
      billing: {
        basicFreight: b.basicFreight,
        handlingCharges: b.handlingCharges,
        deliveryCharges: b.deliveryCharges,
        docketFee: b.docketFee,
        surcharge: b.surcharge,
        gst: b.gst,
        grandTotal: b.grandTotal,
        paymentMode: b.paymentMode
      },
      bookedBy: b.bookedBy,
      status: b.status
    }));

    res.json(responseData);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ success: false, message: 'Database error fetching bookings' });
  }
});

// get single booking
app.get('/api/bookings/:lrNumber', async (req, res) => {
  const { lrNumber } = req.params;
  
  try {
    const b = await Booking.findByPk(lrNumber);
    
    if (!b) {
      return res.status(404).json({ success: false, message: `Booking with LR Number ${lrNumber} not found` });
    }

    const responseData = {
      lrNumber: b.lrNumber,
      bookingDate: b.bookingDate,
      originBranch: b.originBranch,
      destinationBranch: b.destinationBranch,
      consignor: {
        name: b.consignorName,
        mobile: b.consignorMobile,
        address: b.consignorAddress
      },
      consignee: {
        name: b.consigneeName,
        mobile: b.consigneeMobile,
        address: b.consigneeAddress
      },
      parcel: {
        articleType: b.articleType,
        qty: b.qty,
        declaredValue: b.declaredValue,
        actualWeight: b.actualWeight,
        chargedWeight: b.chargedWeight,
        description: b.description
      },
      billing: {
        basicFreight: b.basicFreight,
        handlingCharges: b.handlingCharges,
        deliveryCharges: b.deliveryCharges,
        docketFee: b.docketFee,
        surcharge: b.surcharge,
        gst: b.gst,
        grandTotal: b.grandTotal,
        paymentMode: b.paymentMode
      },
      status: b.status
    };

    res.json(responseData);
  } catch (err) {
    console.error('Error fetching single booking:', err);
    res.status(500).json({ success: false, message: 'Database error fetching booking details' });
  }
});

// delete booking
app.delete('/api/bookings/:lrNumber', async (req, res) => {
  const { lrNumber } = req.params;

  try {
    const booking = await Booking.findOne({ where: { lrNumber } });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    await booking.destroy();
    await saveToDbJson();

    // Broadcast update to all clients
    broadcastDashboardUpdate();

    res.json({ success: true, message: `Booking ${lrNumber} deleted successfully` });
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.status(500).json({ success: false, message: 'Failed to delete booking' });
  }
});

// dashboard stats
app.get('/api/stats', async (req, res) => {
  const { branchCode } = req.query;
  
  const whereClause = {};
  if (branchCode && branchCode.toLowerCase() !== 'corp') {
    whereClause.originBranch = { [likeOp]: branchCode };
  }

  try {
    const totalBookings = await Booking.count({ where: whereClause });
    const totalRevenueVal = await Booking.sum('grandTotal', { where: whereClause }) || 0;
    
    const paymentModes = ['Paid', 'To Pay', 'Account'];
    const breakdown = {};
    
    for (const mode of paymentModes) {
      breakdown[mode] = await Booking.count({
        where: {
          ...whereClause,
          paymentMode: mode
        }
      });
    }

    res.json({
      totalBookings,
      totalRevenue: parseFloat(totalRevenueVal.toFixed(2)),
      averageRevenue: totalBookings > 0 ? parseFloat((totalRevenueVal / totalBookings).toFixed(2)) : 0,
      paymentBreakdown: {
        paid: breakdown['Paid'],
        toPay: breakdown['To Pay'],
        account: breakdown['Account']
      }
    });
  } catch (err) {
    console.error('Error calculating dashboard statistics:', err);
    res.status(500).json({ success: false, message: 'Database error calculating statistics' });
  }
});

// serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// setup db & start server
initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`server & WebSocket are up on port ${PORT}`);
  });
}).catch(err => {
  console.error('db init failed:');
  process.exit(1);
});
