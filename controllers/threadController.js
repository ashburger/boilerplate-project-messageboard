const Thread = require('../models/thread');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
class ThreadController {
    
    async createThread(board, text, delete_password){
        let hashedPassword = bcrypt.hashSync(delete_password, 12);
        let newThread = new Thread({
            board:board,
            text:text,
            delete_password:hashedPassword
        });
        let addedThread = await newThread.save();
        return addedThread;
    }

    async createReply(thread_id, text, delete_password){
        let hashedPassword = bcrypt.hashSync(delete_password, 12);
        let newReply = {
            text:text,
            delete_password:hashedPassword
        }
        let updatedThread = await Thread.findOneAndUpdate({_id:thread_id}, {$push:{replies:newReply}});
        return updatedThread;
    }

    async getBoard(board){
        let boardThreads = await Thread.aggregate([
            {$match:{'board':board}},
            {$project:{'reported':false, 'delete_password':false, 'replies.reported':false, 'replies.delete_password':false}},
            {$addFields:{"replycount":{$size:"$replies"}}},
            {$sort:{'bumped_on':-1, 'created_on':-1}},
            {$addFields:{'replies': {$slice: ['$replies',-3]}}},
            {$limit:10}
        ]);
        return boardThreads;
    }

    async getThread(board, thread_id){
        let thread = await Thread.aggregate([
            {$match:{'board':board, '_id':mongoose.Types.ObjectId(thread_id)}},
            {$project:{'reported':false, 'delete_password':false,'replies.reported':false, 'replies.delete_password':false}},
            {$addFields:{"replycount":{$size:"$replies"}}},
        ]);
        return thread;
    }

    async deleteThread(board, thread_id, delete_password){
        let toBeDeletedThread = await Thread.findOne({_id:thread_id, board:board});
        if(!toBeDeletedThread){
            return {success:false, reason:`Requested thread does not exist under board ${board}`};
        }
        let checkPassword = bcrypt.compareSync(delete_password, toBeDeletedThread.delete_password);
        if(!checkPassword){
            return {success:false, reason:'incorrect password'};
        }
        
        let deletedThread = await Thread.deleteOne({board:board, _id:thread_id});
        if(deletedThread.deletedCount > 0 ){
            return {success:true, reason:'success'};
        }
        return {success:false, reason:'error when deleting thread'}

    }

    async deleteReply(board, thread_id, reply_id, delete_password){
        let checkThreadContainsReply = await Thread.findOne({_id:thread_id, board:board, 'replies._id':reply_id});
        if(checkThreadContainsReply.replies.length == 0){
            return {success:false, reason: "reply doesn't exist"};
        }
        let checkPassword = bcrypt.compareSync(delete_password, checkThreadContainsReply.replies[0].delete_password);
        if(!checkPassword){
            return {success:false, reason:'incorrect password'};
        }
        let deletedReply = await Thread.updateOne({_id:thread_id, 'replies._id':reply_id}, {'replies.$.text':'[deleted]'});
        if(deletedReply.modifiedCount == 1){
            return {success:true, reason:'success'};
        }
        return {success:false, reason:'error deleting reply'};
    }

    async reportThread(board, thread_id){
        let reportedThread = await Thread.updateOne({board:board, _id:thread_id}, {reported:true});
        if(reportedThread.modifiedCount == 1){
            return {success:true, reason:'reported'};
        }
        return {success:false, reason:'error reporting thread'};
    }

    async reportReply(board, thread_id, reply_id){
        let checkThreadContainsReply = await Thread.findOne({_id:thread_id, board:board, 'replies._id':reply_id})
        if(!checkThreadContainsReply || checkThreadContainsReply.replies.length == 0){
            return {success:false, reason: "reply doesn't exist"};
        }
        let reportedReply = await Thread.updateOne({_id:thread_id, 'replies._id':reply_id}, {'replies.$.reported':true});
        if(reportedReply.modifiedCount == 1){
            return {success:true, reason:'reported'};
        }
        return {success:false, reason:'error reporting reply'};

    }

}

module.exports = ThreadController