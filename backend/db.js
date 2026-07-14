require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const host = process.env.DB_HOST || 'localhost';
const port = parseInt(process.env.DB_PORT, 10) || 5432;
const database = process.env.DB_NAME || 'rcargo';
const username = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASSWORD || 'password';

let sequelize;
let usePostgres = false;

if (process.env.DATABASE_URL) {
  console.log(`[Database] PostgreSQL DATABASE_URL detected. Connecting...`);
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Required by many cloud databases (e.g. Render, Railway)
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
  usePostgres = true;
} else {
  // Probe PostgreSQL port synchronously at load time to decide the dialect
  try {
    // Test connection to the port with a short timeout (800ms)
    execSync(`node -e "const net = require('net'); const client = net.connect({host: '${host}', port: ${port}, timeout: 800}, () => { process.exit(0); }); client.on('error', () => { process.exit(1); }); setTimeout(() => { process.exit(1); }, 800);"`);
    usePostgres = true;
  } catch (err) {
    usePostgres = false;
  }

  if (usePostgres) {
    console.log(`[Database] PostgreSQL service detected on ${host}:${port}. Initializing dialect 'postgres'...`);
    sequelize = new Sequelize(database, username, password, {
      host: host,
      port: port,
      dialect: 'postgres',
      logging: false,
      retry: {
        max: 1
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  } else {
    console.log(`[Database] PostgreSQL service not detected on ${host}:${port}. Falling back to SQLite...`);
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: path.join(__dirname, 'rcargo.sqlite'),
      logging: false
    });
  }
}

// ------------------ MODELS ------------------

// 1. Branch Model
const Branch = sequelize.define('Branch', {
  code: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'branches',
  timestamps: false
});

// 2. User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  branchCode: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['username', 'branchCode']
    }
  ]
});

// 3. News Model
const News = sequelize.define('News', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'news',
  timestamps: false
});

// 4. Booking Model
const Booking = sequelize.define('Booking', {
  lrNumber: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  bookingDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  originBranch: {
    type: DataTypes.STRING,
    allowNull: false
  },
  destinationBranch: {
    type: DataTypes.STRING,
    allowNull: false
  },
  consignorName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  consignorMobile: {
    type: DataTypes.STRING,
    allowNull: false
  },
  consignorAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },
  consigneeName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  consigneeMobile: {
    type: DataTypes.STRING,
    allowNull: false
  },
  consigneeAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },
  articleType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Box'
  },
  qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  declaredValue: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    defaultValue: 0
  },
  actualWeight: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    defaultValue: 0
  },
  chargedWeight: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    defaultValue: 0
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },
  basicFreight: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    defaultValue: 0
  },
  handlingCharges: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    defaultValue: 0
  },
  deliveryCharges: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    defaultValue: 0
  },
  docketFee: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    defaultValue: 0
  },
  surcharge: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    defaultValue: 0
  },
  gst: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    defaultValue: 0
  },
  grandTotal: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    defaultValue: 0
  },
  paymentMode: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Paid'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Booked'
  }
}, {
  tableName: 'bookings',
  timestamps: false
});


// ------------------ AUTO-SEEDING DATA MIGRATION ROUTINE ------------------
async function initDatabase() {
  try {
    if (usePostgres) {
      try {
        await sequelize.authenticate();
      } catch (err) {
        // If database does not exist and we are NOT using a cloud DATABASE_URL, create it locally
        if (!process.env.DATABASE_URL && (err.message.includes('does not exist') || err.original?.code === '3D000')) {
          console.log(`[Database] Database "${database}" does not exist on PostgreSQL. Creating now...`);
          const { Client } = require('pg');
          const client = new Client({
            host,
            port,
            user: username,
            password,
            database: 'postgres'
          });
          await client.connect();
          await client.query(`CREATE DATABASE "${database}"`);
          await client.end();
          console.log(`[Database] Database "${database}" created successfully.`);

          // Retry connecting
          await sequelize.authenticate();
        } else {
          throw err;
        }
      }
    } else {
      await sequelize.authenticate();
    }

    console.log('[Database] Database connection established successfully.');

    // Synchronize schemas with database
    await sequelize.sync();
    console.log('[Database] Database tables synchronized.');

    // Seed database if empty
    const branchCount = await Branch.count();
    if (branchCount === 0) {
      console.log('[Database] Database is empty. Initiating automatic migration from db.json...');
      const dbPath = path.join(__dirname, 'db.json');
      if (fs.existsSync(dbPath)) {
        const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        // 1. Seed branches
        if (dbData.branches && dbData.branches.length > 0) {
          await Branch.bulkCreate(dbData.branches);
          console.log(`[Database] Seeded ${dbData.branches.length} branches.`);
        }

        // 2. Seed users
        if (dbData.users && dbData.users.length > 0) {
          await User.bulkCreate(dbData.users);
          console.log(`[Database] Seeded ${dbData.users.length} users.`);
        }

        // 3. Seed news
        if (dbData.news && dbData.news.length > 0) {
          const mappedNews = dbData.news.map((item, idx) => ({
            id: idx + 1,
            date: item.date,
            title: item.title,
            content: item.content
          }));
          await News.bulkCreate(mappedNews);
          console.log(`[Database] Seeded ${mappedNews.length} announcements.`);
        }

        // 4. Seed bookings
        if (dbData.bookings && dbData.bookings.length > 0) {
          const mappedBookings = dbData.bookings.map(b => ({
            lrNumber: b.lrNumber,
            bookingDate: b.bookingDate,
            originBranch: b.originBranch,
            destinationBranch: b.destinationBranch,
            consignorName: b.consignor.name,
            consignorMobile: b.consignor.mobile,
            consignorAddress: b.consignor.address || '',
            consigneeName: b.consignee.name,
            consigneeMobile: b.consignee.mobile,
            consigneeAddress: b.consignee.address || '',
            articleType: b.parcel.articleType,
            qty: b.parcel.qty,
            declaredValue: b.parcel.declaredValue || 0,
            actualWeight: b.parcel.actualWeight || 0,
            chargedWeight: b.parcel.chargedWeight || 0,
            description: b.parcel.description || '',
            basicFreight: b.billing.basicFreight,
            handlingCharges: b.billing.handlingCharges,
            deliveryCharges: b.billing.deliveryCharges || 0,
            docketFee: b.billing.docketFee || 0,
            surcharge: b.billing.surcharge || 0,
            gst: b.billing.gst,
            grandTotal: b.billing.grandTotal,
            paymentMode: b.billing.paymentMode,
            status: b.status || 'Booked'
          }));
          await Booking.bulkCreate(mappedBookings);
          console.log(`[Database] Seeded ${mappedBookings.length} historical bookings.`);
        }
        console.log('[Database] Data migration from db.json completed successfully!');
      } else {
        console.log('[Database] Warning: db.json not found. Database seeded as empty.');
      }
    }
  } catch (error) {
    console.error('[Database] Connection or synchronization error:', error);
    throw error;
  }
}

async function saveToDbJson() {
  try {
    const branches = await Branch.findAll({ order: [['name', 'ASC']] });
    const users = await User.findAll({ order: [['username', 'ASC']] });
    const bookings = await Booking.findAll({ order: [['bookingDate', 'ASC']] });
    const news = await News.findAll({ order: [['date', 'DESC'], ['id', 'DESC']] });

    const dbData = {
      users: users.map(u => ({
        type: u.type,
        branchCode: u.branchCode,
        username: u.username,
        password: u.password,
        name: u.name
      })),
      branches: branches.map(b => ({
        code: b.code,
        name: b.name
      })),
      bookings: bookings.map(b => ({
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
      })),
      news: news.map(n => ({
        date: n.date,
        title: n.title,
        content: n.content
      }))
    };

    const dbPath = path.join(__dirname, 'db.json');
    fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');
    console.log('[Database] db.json updated successfully.');
  } catch (err) {
    console.error('[Database] Failed to write back to db.json:', err);
  }
}

module.exports = {
  sequelize,
  Branch,
  User,
  News,
  Booking,
  initDatabase,
  saveToDbJson
};

