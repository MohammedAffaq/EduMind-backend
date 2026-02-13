const mongoose = require('mongoose');
const User = require('./models/User');
const path = require('path');
const fs = require('fs');

const logFile = path.resolve(__dirname, 'debug.log');
// Delete previous log
try { fs.unlinkSync(logFile); } catch (e) { }

const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

require('dotenv').config({ path: path.resolve(__dirname, '.env') });

log('Starting debug script...');
log('MONGODB_URI: ' + (process.env.MONGODB_URI ? 'Present' : 'MISSING'));

const run = async () => {
    try {
        log('Connecting to mongoose...');
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 10000,
        });
        log('Connected. State: ' + mongoose.connection.readyState);

        const email = 'darshini.reddy0229@gmail.com';
        log(`Querying for email: ${email}`);

        // Race the query against a timeout
        const queryPromise = User.findOne({ email });
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timed out')), 5000)
        );

        const user = await Promise.race([queryPromise, timeoutPromise]);

        if (user) {
            log('User found!');
            log(JSON.stringify(user.toObject(), null, 2));
        } else {
            log('User not found.');
            // List all users
            const count = await User.countDocuments();
            log(`Total users in DB: ${count}`);
            if (count < 20) {
                const all = await User.find({}, 'email role');
                log('List: ' + all.map(u => `${u.email} (${u.role})`).join(', '));
            }
        }

    } catch (e) {
        log('ERROR: ' + e.message);
        if (e.cause) log('Cause: ' + e.cause);
    } finally {
        log('Closing connection...');
        await mongoose.disconnect();
        log('Done.');
        process.exit(0);
    }
};

run();
