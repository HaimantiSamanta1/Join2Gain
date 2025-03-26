const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables from the .env file
dotenv.config();

// Ensure dbURI is loaded correctly
const dbURI = process.env.dbURI;

if (!dbURI) {
    console.error('Error: dbURI is not defined in your .env file.');
    process.exit(1); 
}

const connectDB = async () => {
    try {
        await mongoose.connect(dbURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            connectTimeoutMS: 80000,
            socketTimeoutMS: 80000,
        });
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('MongoDB Connection Error: ', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
