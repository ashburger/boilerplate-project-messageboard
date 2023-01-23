'use strict';
const ThreadController = require('../controllers/threadController');
let threadController = new ThreadController();
module.exports = function (app) {

  app.route('/api/threads/:board').post(async function(req, res){
    try{
      let board = req.params.board || req.body.board;
      let newThread = await threadController.createThread(board, req.body.text, req.body.delete_password);
      if(newThread){
        return res.redirect(`/b/${board}/`);
      }else{
        return res.send({error:'Error when adding thread'});
      }
    }catch(err){
      console.log(err);
      return res.send({error:'Error when adding thread'});
    }
  });
    
  app.route('/api/replies/:board').post(async function(req, res){
    try{
      let board = req.params.board || req.body.board;
      let newReply = await threadController.createReply(req.body.thread_id, req.body.text, req.body.delete_password);
      if(newReply){
        return res.redirect(`/b/${board}/${req.body.thread_id}`);
      }else{
        console.log(newReply)
        return res.send({error:'Error when replying to thread'});
      }
    }catch(err){
      console.log(err);
      return res.send({error:'Error when replying to thread'});
    }
  });

  app.route('/api/threads/:board').get(async function(req, res){
    try{
      let board = req.params.board || req.body.board;
      let boardThreads = await threadController.getBoard(board);
      if(boardThreads){
        return res.json(boardThreads);
      }else{
        return res.send({error:'Error getting board'})
      }
    }catch(err){
      console.log(err);
      return res.send({error:'Error getting board'})
    }
  });

  app.route('/api/replies/:board').get(async function(req, res){
    try{
      let board = req.params.board || req.body.board;
      let thread = await threadController.getThread(board, req.query.thread_id);
      if(thread){
        return res.json(thread[0]);
      }else{
        return res.send({error:'Error getting thread'})
      }
    }catch(err){
      console.log(err);
      return res.send({error:'Error getting thread'})
    }
  });

  app.route('/api/threads/:board').delete(async function(req, res){
    try{
      let board = req.params.board || req.body.board;
      let deletedThread = await threadController.deleteThread(board, req.body.thread_id, req.body.delete_password);
      return res.send(deletedThread.reason);
    }catch(err){
      console.log(err);
      return res.send('error deleting thread');
    }
  });

  app.route('/api/replies/:board').delete(async function(req, res){
    try{
      let board = req.params.board || req.body.board;
      let deletedThread = await threadController.deleteReply(board, req.body.thread_id, req.body.reply_id, req.body.delete_password);
      return res.send(deletedThread.reason);
    }catch(err){
      console.log(err);
      return res.send('error deleting reply');
    }
  });

  app.route('/api/threads/:board').put(async function(req, res){
    try{
      let board = req.params.board || req.body.board;
      let thread_id = req.body.thread_id || req.body.report_id;
      let reportedThread = await threadController.reportThread(board, thread_id);
      return res.send(reportedThread.reason)
    }catch(err){
      console.log(err);
      return res.send('error reporting thread');
    }
  });

  app.route('/api/replies/:board').put(async function(req, res){
    try{
      let board = req.params.board || req.body.board;
      let reply_id = req.body.reply_id || req.body.report_id
      let reportedReply = await threadController.reportReply(board, req.body.thread_id, reply_id);
      return res.send(reportedReply.reason)
    }catch(err){
      console.log(err);
      return res.send('error reporting reply');
    }
  });

};
