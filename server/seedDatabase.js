require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crisissync';

async function seedUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const adminUser = new User({
        username: 'admin',
        password: 'password123',
        role: 'admin'
      });
      await adminUser.save();
      console.log('Admin user successfully created!');
    } else {
      console.log('Admin user already exists.');
    }

    // Create a staff user too for testing assignments
    const existingStaff = await User.findOne({ username: 'responder1' });
    if (!existingStaff) {
      const staffUser = new User({
        username: 'responder1',
        password: 'password123',
        role: 'staff'
      });
      await staffUser.save();
      console.log('Staff user successfully created!');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error seeding data: ', err);
    process.exit(1);
  }
}

seedUser();
