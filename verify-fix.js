const http = require('http');

const PORT = 5000;
const EMAIL = `driver_test_${Date.now()}@edumind.com`;
const PASSWORD = 'password123';

function request(path, method, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function verify() {
    console.log('🚀 Starting Verification on Port', PORT);
    console.log('📧 Using email:', EMAIL);

    // 1. Register
    console.log('\nTesting Registration...');
    try {
        const registerRes = await request('/api/auth/register', 'POST', {
            firstName: 'Test',
            lastName: 'Driver',
            email: EMAIL,
            phone: `99${Date.now().toString().slice(-8)}`, // Unique phone
            password: PASSWORD,
            role: 'staff',
            staffType: 'non-teaching',
            designation: 'Driver'
        });

        console.log('Register Status:', registerRes.status);
        if (registerRes.status !== 201) {
            console.error('❌ Registration Failed:', registerRes.data);
            process.exit(1);
        }
        console.log('✅ Registration Successful');

    } catch (e) {
        console.error('❌ Registration Error (Is server running?):', e.message);
        process.exit(1);
    }

    // 2. Login
    console.log('\nTesting Login...');
    try {
        const loginRes = await request('/api/auth/login', 'POST', {
            email: EMAIL,
            password: PASSWORD
        });

        console.log('Login Status:', loginRes.status);
        if (loginRes.status !== 200) {
            console.error('❌ Login Failed:', loginRes.data);
            process.exit(1);
        }

        const user = loginRes.data.user;
        console.log('User Data Received:', user);

        if (user.staffType === 'non-teaching' && user.designation === 'Driver') {
            console.log('✅ SUCCESS: staffType and designation match!');
            console.log('✅ Fix is executing correctly. Frontend should now redirect properly.');
        } else {
            console.error('❌ FAILED: Missing or incorrect staffType/designation');
            console.error('Expected: staffType="non-teaching", designation="Driver"');
            console.error('Received:', user);
            process.exit(1);
        }

    } catch (e) {
        console.error('❌ Login Error:', e.message);
        process.exit(1);
    }
}

verify();
