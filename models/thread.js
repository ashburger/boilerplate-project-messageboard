const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  text: {type: String, required:true},
  delete_password: {type: String, required:true},
  reported: {type:Boolean, default:false, required:true}
}, {
  timestamps: {createdAt: 'created_on', updatedAt: 'bumped_on'},
  });

const threadSchema = new mongoose.Schema({
  board: {type:String, required:true},
  text: {type: String, required:true},
  delete_password: {type: String, required:true},
  reported: {type:Boolean, default:false, required:true},
  replies: [replySchema]
}, {
  timestamps: {createdAt: 'created_on', updatedAt: 'bumped_on'},
  });

module.exports = mongoose.model('Thread', threadSchema)