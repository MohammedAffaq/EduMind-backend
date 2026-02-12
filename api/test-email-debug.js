const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('--- Email Debug Script ---');
console.log('Loading environment variables...');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not Set');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set (Length: ' + process.env.EMAIL_PASS.length + ')' : 'Not Set');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function testEmail() {
    try {
        console.log('Verifying transporter...');
        await transporter.verify();
        console.log('Transporter verification successful!');

        console.log('Sending test email...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to self
            subject: 'EduMind Test Email',
            text: 'This is a test email from the debug script.'
        });

        console.log('Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('Email Test Failed:', error);
    }
}

testEmail();
