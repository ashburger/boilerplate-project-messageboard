const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');
const bcrypt = require('bcrypt');
chai.use(chaiHttp);
require('dotenv').config();

const domainName = process.env.DOMAIN_NAME;
const boardName = 'functionalTests';
const delete_password = 'password';
const Thread = require('../models/thread');
// clear Test DB and initialize threads for testing purposes
Thread.deleteMany().exec();
let initThreads = []
for(let i=1;i<11;i++){
    let thread = new Thread({board:boardName, text:`test thread ${i}`, delete_password: bcrypt.hashSync(delete_password, 12)});
    // thread.save().then((result)=>{console.log(result)});
    initThreads.push(thread);
}
const thread1Id = initThreads[0]._id.toString();
Thread.bulkSave(initThreads);
suite('Functional Tests', function() {

    test('Create a new thread', function(done){
        chai.request(server)
        .post(`/api/threads/${boardName}`)
        .send({text:'test thread 11', delete_password:delete_password})
        .end(async (err, res) => {
            const checkData = await fetch(`${domainName}/api/threads/${boardName}`);
            let data = await checkData.json();
            assert.equal(data[0].text, 'test thread 11');
            assert.equal(data[0].board, boardName);
            assert.notEqual(data[0].delete_password, delete_password);
            assert.equal(data[0].created_on, data[0].bumped_on);
            assert.isArray(data[0].replies);
            done();
        });
    });

    test('Create a new reply', function(done){
        chai.request(server)
        .post(`/api/replies/${boardName}`)
        .send({thread_id:thread1Id, text:'test reply 1', delete_password:delete_password})
        .end(async (err, res) => {
            // to test for when more than 3 replies exist on a thread
            for(let i=2;i<5;i++){
                let reply = {text:`test reply ${i}`, delete_password:bcrypt.hashSync(delete_password, 12)};
                reply = await Thread.updateOne({_id:thread1Id}, {$push:{replies:reply}}, {new:true});
            }
            const checkData = await fetch(`${domainName}/api/threads/${boardName}`);
            let data = await checkData.json();
            assert.equal(data[0].text, 'test thread 1');
            assert.notEqual(data[0].created_on, data[0].bumped_on);
            assert.isTrue(data[0].bumped_on > data[0].created_on);
            assert.equal(data[0].replies[0].text, 'test reply 2');
            assert.equal(data[0].replies[2].created_on, data[0].bumped_on);
            done();
        });
    });

    test('Get all threads on a board', function(done){
        chai.request(server)
        .get(`/api/threads/${boardName}`)
        .end((err, res) => {
            assert.equal(res.body[0].text, 'test thread 1');
            assert.equal(res.body.length, 10);
            assert.equal(res.body[0].replies.length, 3);
            assert.equal(res.body[0].replies[0].text, 'test reply 2');
            assert.equal(res.body[0].replycount, 4);
            assert.notProperty(res.body[0], 'delete_password');
            assert.notProperty(res.body[0], 'reported');
            done();
        });
    });

    test('Get one thread with all replies', function(done){
        chai.request(server)
        .get(`/api/replies/${boardName}`)
        .query({thread_id:thread1Id})
        .end((err, res) => {
            assert.equal(res.body.text, 'test thread 1');
            assert.equal(res.body.replies.length, 4);
            assert.equal(res.body.replies[0].text, 'test reply 1');
            assert.notProperty(res.body, 'delete_password');
            assert.notProperty(res.body, 'reported');
            assert.notProperty(res.body.replies[0], 'delete_password');
            assert.notProperty(res.body.replies[0], 'reported');
            done();
        });
    });

    test('Report a thread', function(done){
        chai.request(server)
        .put(`/api/threads/${boardName}`)
        .send({thread_id:thread1Id})
        .end(async (err, res) => {
            assert.equal(res.text, 'reported');
            let thread1 = await Thread.findOne({_id:thread1Id});
            assert.isTrue(thread1.reported);
            done();
        });
    });
    test('Report a reply', function(done){
        // then block needed to get reply id
        Thread.findOne({text:'test thread 1', board:boardName}).then((thread1)=>{
            if(thread1){
                chai.request(server)
                .put(`/api/replies/${boardName}`)
                .send({thread_id:thread1Id, reply_id:thread1.replies[0]._id})
                .end(async (err, res) => {
                    assert.equal(res.text, 'reported');
                    let thread1 = await Thread.findOne({_id:thread1Id});
                    assert.isTrue(thread1.replies[0].reported);
                    done();
                });
            }else{
                assert.equal(1,2, "Couldn't find required thread, possible test error"); //fails the test
                done();
            }
        }).catch((err)=>{
            assert.equal(1,2, "Couldn't find required thread, possible test error"); //fails the test
            done();
        });
        
    });

    test('Delete a reply with incorrect password', function(done){
        // then block needed to get reply id
        Thread.findOne({text:'test thread 1', board:boardName}).then((thread1)=>{
            if(thread1){
                let thread1Id = thread1._id;
                chai.request(server)
                .delete(`/api/replies/${boardName}`)
                .send({thread_id:thread1Id, reply_id:thread1.replies[1]._id, delete_password:'incorrect password'})
                .end(async (err, res) => {
                    assert.equal(res.text, 'incorrect password');
                    let thread1 = await Thread.findOne({_id:thread1Id});
                    assert.notEqual(thread1.replies[1].text, '[deleted]');
                    done();
                });
            } else{
                assert.equal(1,2, "error: Couldn't find required thread"); //fails the test
                done();
            }
        }).catch((err)=>{
            assert.equal(1,2, "error: Couldn't find required thread"); //fails the test
            done();
        });
    });

    test('Delete a thread with incorrect password', function(done){
        Thread.findOne({text:'test thread 4'}).then((thread4)=>{
            if(thread4){
                let thread4Id = thread4._id;
                chai.request(server)
                .delete(`/api/threads/${boardName}`)
                .send({thread_id:thread4Id, delete_password:'incorrect password'})
                .end(async (err, res) => {
                    assert.equal(res.text, 'incorrect password');
                    let thread4 = await Thread.findOne({_id:thread4Id});
                    assert.isNotNull(thread4);
                    done();
                });
            }else{
                assert.equal(1,2,'Error deleteing thread, it doesnt exist');
                done();
            }
        }).catch((err)=>{
            assert.equal(1,2,'Error deleteing thread, it doesnt exist');
            done();
        })
    });

    test('Delete a reply with correct password', function(done){
        // then block needed to get reply id
        Thread.findOne({text:'test thread 1', board:boardName}).then((thread1)=>{
            if(thread1){
                chai.request(server)
                .delete(`/api/replies/${boardName}`)
                .send({thread_id:thread1Id, reply_id:thread1.replies[0]._id, delete_password:delete_password})
                .end(async (err, res) => {
                    assert.equal(res.text, 'success');
                    let thread1 = await Thread.findOne({_id:thread1Id});
                    assert.equal(thread1.replies[0].text, '[deleted]');
                    done();
                });
            } else{
                assert.equal(1,2, "Couldn't find required thread, possible test error"); //fails the test
                done();
            }
        }).catch((err)=>{
            assert.equal(1,2, "Couldn't find required thread, possible test error"); //fails the test
            done();
        });
        
    });

    test('Delete a thread with correct', function(done){
        chai.request(server)
        .delete(`/api/threads/${boardName}`)
        .send({thread_id:initThreads[1]._id, delete_password:delete_password})
        .end(async (err, res) => {
            assert.equal(res.text, 'success');
            let thread2 = await Thread.findOne({_id:initThreads[1]._id});
            assert.isNull(thread2);
            done();
        });
    });

});
