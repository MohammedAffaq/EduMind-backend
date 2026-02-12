const { Schema, model } = require('mongoose');

const loginLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  loginTime: { type: Date, required: true },
  ipAddress: { type: String, required: true },
  deviceInfo: { type: String, required: true }
});

module.exports = model('LoginLog', loginLogSchema);
