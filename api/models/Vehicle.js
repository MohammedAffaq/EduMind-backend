const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VehicleSchema = new Schema({
  vehicleNumber: { type: String, required: true, unique: true },
  routeName: { type: String, required: true },
  pickupPoints: [String],
  dropPoints: [String],
  assignedDriver: { type: Schema.Types.ObjectId, ref: 'User' },
  capacity: Number,
  status: { type: String, enum: ['Active', 'Maintenance', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', VehicleSchema);