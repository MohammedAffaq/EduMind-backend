const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('Loading .env from:', path.resolve(__dirname, '.env'));
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Defined' : 'UNDEFINED');

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env file');
        }

        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        const collection = conn.connection.db.collection('users');

        console.log('Fetching indexes...');
        const indexes = await collection.indexes();
        console.log('Current Indexes:', indexes);

        const targetIndex = indexes.find(idx => idx.name === 'id_1');

        if (targetIndex) {
            console.log('Found rogue index "id_1". Dropping it...');
            await collection.dropIndex('id_1');
            console.log('Successfully dropped index "id_1"');
        } else {
            console.log('Index "id_1" not found. It might have already been removed.');
        }

        process.exit(0);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB();
