const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TaskSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed'], 
    default: 'pending' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  dueDate: Date,
  department: String,
  completionDate: Date,
  history: [{
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: String,
    comment: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

TaskSchema.methods.updateStatus = function(status, userId, comment) {
  this.status = status;
  this.history.push({ updatedBy: userId, status, comment });
  return this.save();
};

module.exports = mongoose.model('Task', TaskSchema);