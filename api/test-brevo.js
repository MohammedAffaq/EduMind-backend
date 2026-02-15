const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') }); // Load strictly from api/.env

const logFile = path.join(__dirname, 'test_results.log');
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

// Clear previous log
fs.writeFileSync(logFile, '');

async function testBrevo() {
    log('Testing Brevo SMTP Configuration...');
    log('Host: ' + process.env.EMAIL_HOST);
    log('Port: ' + process.env.EMAIL_PORT);
    log('User: ' + process.env.EMAIL_USER);

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: 2525, // Explicitly testing 2525
        secure: false, // true for 465
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        connectionTimeout: 10000,
        debug: true,
        logger: true // Enable internal nodemailer logging
    });

    try {
        log('Attempting to verify connection...');
        await transporter.verify();
        log('✅ Connection verified successfully with port ' + (process.env.EMAIL_PORT || 587));
    } catch (error) {
        log('❌ Connection failed: ' + error.message);
        if (error.code === 'ETIMEDOUT') {
            log('💡 Suggestion: Try port 2525 if 587 is blocked.');
        }
        log('Full error: ' + JSON.stringify(error, null, 2));
    }
}

testBrevo();
