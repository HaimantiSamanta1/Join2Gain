// const mongoose = require('mongoose');
// const fs = require('fs');
// const path = require('path');

// const connectDB = async () => {
//   try {
//     const ca = [fs.readFileSync(path.resolve(__dirname, '../certs/evennode.pem'))];

//     const uri = `mongodb://${process.env.MONGO_USER}:${encodeURIComponent(process.env.MONGO_PASS)}@${process.env.MONGO_HOST}/${process.env.MONGO_DB}?replicaSet=${process.env.REPLICA_SET}&ssl=true`;

//     await mongoose.connect(uri, {
//       sslCA: ca,
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });

//     console.log('Connected to MongoDB (EvenNode)');
//   } catch (err) {
//     console.error('MongoDB connection error:', err.message);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const connectDB = async () => {
  try {
    const caPath = path.resolve(__dirname, '../certs/evennode.pem');

    const uri = `mongodb://${process.env.MONGO_USER}:${encodeURIComponent(process.env.MONGO_PASS)}@${process.env.MONGO_HOST}/${process.env.MONGO_DB}?replicaSet=${process.env.REPLICA_SET}`;

    await mongoose.connect(uri, {
      tls: true,
      tlsCAFile: caPath, 
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB (EvenNode)');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
