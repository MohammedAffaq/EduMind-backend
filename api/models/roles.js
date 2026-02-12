const { Schema, model } = require('mongoose');

const roleSchema = new Schema({
  roleName: { type: String, enum: ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'STAFF_TEACHING', 'STAFF_NON_TEACHING', 'DRIVER'], required: true, unique: true }
});

module.exports = model('Role', roleSchema);
