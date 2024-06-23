import db from '../models/index.js'
import JWT from "jsonwebtoken";
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import multer from "multer";
import path from "path";
import moment from "moment-timezone";
import axios from "axios";
import chalk from 'chalk';
import NotificationType from '../models/user/notificationtype.js';
import { createNotification } from "../utilities/notificationutility.js";
// import { Pinecone } from "@pinecone-database/pinecone";
import pusher from '../utilities/pusher.js'
import ChatResource from '../resources/chat.resource.js';

import S3 from "aws-sdk/clients/s3.js";
import AWS from 'aws-sdk';
import fs from 'fs';
import { promisify } from 'util';



// const  ChatResource = require("../resources/chat/chatresource")
// const  MessageResource = require("../resources/chat/messageresource");
// const e = require("express");

// controllers/chatController.js
// import db from '../models'; // Adjust the path according to your project structure


//function to upload to AWS
function uploadMedia(fieldname, fileContent, mime = "image/jpeg", completion) {
    const s3 = new S3({
        accessKeyId: process.env.AccessKeyId,
        secretAccessKey: process.env.SecretAccessKey,
        region: process.env.Region
    })
    const params = {
        Bucket: process.env.Bucket,
        Key: fieldname + "Profile" + Date.now(),
        Body: fileContent,
        ContentDisposition: 'inline',
        ContentType: mime
        // ACL: 'public-read',
    }
    const result = s3.upload(params, async (err, d) => {
        if (err) {
            completion(null, err.message);
            // return null
        }
        else {
            // user.profile_image = d.Location;
            completion(d.Location, null);
        }
    });
}

// Function to create a chat
const checkUsersInSameChat = async (userId1, userId2) => {
    try {
        // Find all chatIds for the first user
        const user1Chats = await db.ChatUser.findAll({
            where: { userId: userId1 },
            attributes: ['chatId']
        });

        // Find all chatIds for the second user
        const user2Chats = await db.ChatUser.findAll({
            where: { userId: userId2 },
            attributes: ['chatId']
        });

        // Extract chatIds from the results
        const user1ChatIds = user1Chats.map(chatUser => chatUser.chatId);
        const user2ChatIds = user2Chats.map(chatUser => chatUser.chatId);

        // Find common chatIds
        const commonChatIds = user1ChatIds.filter(chatId => user2ChatIds.includes(chatId));

        if (commonChatIds.length > 0) {
            console.log(`Users ${userId1} and ${userId2} have common chat IDs.`);
            return commonChatIds;
        } else {
            console.log(`Users ${userId1} and ${userId2} do not have any common chat IDs.`);
            return [];
        }
    } catch (err) {
        console.error('Error checking common chat IDs:', err);
        throw err;
    }
};
export const CreateChat = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            const userIds = [authData.user.id, req.body.userId];

            try {
                // Find all chats involving the current user and the other user
                let result = await checkUsersInSameChat(authData.user.id, req.body.userId);

                // return
                if (result.length == 0) {
                    const chat = await db.Chat.create({ name: "" });

                    // Add users to chat
                    for (const userId of userIds) {
                        await db.ChatUser.create({ chatId: chat.id, userId });
                    }

                    const chatData = await ChatResource(chat, authData.user);
                    res.send({ status: true, message: 'Chat created successfully.', data: chatData });
                }
                else {
                    let chatid = result[0]
                    // console.log("Chatids ", result);
                    let chat = await db.Chat.findByPk(chatid);
                    let chatRes = await ChatResource(chat, authData.user);
                    res.send({ status: true, message: 'Chat exists already.', data: chatRes });
                }



            } catch (err) {
                console.error('Error creating/fetching chat:', err);
                res.status(500).send({ status: false, message: 'An error occurred while creating/fetching the chat.', error: err.message });
            }
        } else {
            res.status(401).send({ status: false, message: 'Unauthenticated user.' });
        }
    });
};

// Function to update a chat
export const UpdateChat = async (req, res) => {
    const { chatId } = req.params;
    const { name } = req.body;

    try {
        const chat = await db.Chat.findByPk(chatId);
        if (!chat) {
            return res.status(404).send({ status: false, message: 'Chat not found.' });
        }

        chat.name = name;
        await chat.save();

        res.send({ status: true, message: 'Chat updated successfully.', data: chat });
    } catch (err) {
        console.error('Error updating chat:', err);
        res.status(500).send({ status: false, message: 'An error occurred while updating the chat.', error: err.message });
    }
};

// Function to send a message for a chat
export const SendMessage = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            // const { chatId } = req.params;
            const { chatId, content } = req.body;

            try {
                let message = await db.Message.create({ chatId: chatId, userId: authData.user.id, content: content });
                let chatUsers = await db.ChatUser.findAll({
                    where: {
                        chatId,
                        userId: { [db.Sequelize.Op.ne]: authData.user.id }
                    }
                })
                // console.log()
                await db.ChatUser.increment(
                    'unread',
                    {
                        by: 1,
                        where: {
                            chatId,
                            userId: { [db.Sequelize.Op.ne]: authData.user.id }
                        }
                    }
                );
                // message.timestamp = req.body.timestamp;
                if (chatUsers.length > 0) {
                    chatUsers.forEach(async element => {
                        console.log("Sending notification to ", element.userId)

                        pusher.trigger(`chat-channel-${chatId}`, `new-message`, { message: message, timestamp: req.body.timestamp });
                        try{
                            let created = await createNotification(authData.user.id, element.userId, message.id, NotificationType.TypeMessage);
                        }
                        catch(error){
                            console.log("Notification send message error ", error)
                        }
                    });
                }

                res.send({ status: true, message: 'Message sent successfully.', data: message });
            } catch (err) {
                console.error('Error sending message:', err);
                res.status(500).send({ status: false, message: 'An error occurred while sending the message.', error: err.message });
            }
        }

    })

};

export const SendMediaMessage = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            // const { chatId } = req.params;
            const { chatId } = req.body;

            const files = req.files;
            let imageDimensions = { width: null, height: null };


            try {
                let image = null, thumbnail = null;

                if (files.media) {
                    await new Promise((resolve, reject) => {
                        uploadMedia(files.media[0].fieldname, files.media[0].buffer, files.media[0].mimetype, (uploadedUrl, error) => {
                            if (error) {
                                reject(new Error("Failed to upload media"));
                            } else {
                                // files.media[0].mimetype.includes("video") ? video = uploadedUrl : image = uploadedUrl;
                                image = uploadedUrl;
                                resolve();
                            }
                        });
                    });
                }

                if (files.media && files.media[0].mimetype.includes("video") && files.thumbnail) {
                    const metadata = await sharp(files.thumbnail[0].buffer).metadata();
                    imageDimensions.width = metadata.width;
                    imageDimensions.height = metadata.height;
                    await new Promise((resolve, reject) => {
                        uploadMedia(files.thumbnail[0].fieldname, files.thumbnail[0].buffer, files.thumbnail[0].mimetype, (uploadedUrl, error) => {
                            if (error) {
                                reject(new Error("Failed to upload thumbnail"));
                            } else {
                                thumbnail = uploadedUrl;
                                resolve();
                            }
                        });
                    });
                }
                else{
                    const metadata = await sharp(files.media[0].buffer).metadata();
                    imageDimensions.width = metadata.width;
                    imageDimensions.height = metadata.height;
                }


                // create the new message
                let message = await db.Message.create({ chatId: chatId, userId: authData.user.id, content: '', image_url: image, 
                    thumb_url: thumbnail, image_width: imageDimensions.width, image_height: imageDimensions.height });
                let chatUsers = await db.ChatUser.findAll({
                    where: {
                        chatId,
                        userId: { [db.Sequelize.Op.ne]: authData.user.id }
                    }
                })
                // console.log()
                await db.ChatUser.increment(
                    'unread',
                    {
                        by: 1,
                        where: {
                            chatId,
                            userId: { [db.Sequelize.Op.ne]: authData.user.id }
                        }
                    }
                );
                // message.timestamp = req.body.timestamp;
                if (chatUsers.length > 0) {
                    chatUsers.forEach(async element => {
                        console.log("Sending notification to ", element.userId)

                        pusher.trigger(`chat-channel-${chatId}`, `new-message`, { message: message, timestamp: req.body.timestamp });
                        try{
                            let created = await createNotification(authData.user.id, element.userId, message.id, NotificationType.TypeMessage);
                        }
                        catch(error){
                            console.log("Notification send message error ", error)
                        }
                    });
                }

                res.send({ status: true, message: 'Message sent successfully.', data: message });

            } catch (uploadError) {
                console.error('Error sending media:', uploadError);
                res.status(500).json({
                    status: false,
                    message: "Failed to send media",
                    error: uploadError.message
                });
            }



        }

    })

};

export async function TestPusher(req, res) {
    let message = req.body.message;
    pusher.trigger(`my-channel`, `new-message`, { message: message });
    res.send({ status: true, message: 'Message sent successfully.', data: message });
}
// JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
//     if (authData) {

//     }
// })
// Function to load messages for a chat
export const GetMessages = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            // const { chatId } = req.params;
            let chatId = req.query.chatId;
            let offset = req.query.offset || 0;

            // Set default offset to 0 if not provided
            offset = offset ? parseInt(offset, 10) : 0;

            try {
                const messages = await db.Message.findAll({
                    where: { chatId: chatId },
                    order: [['createdAt', 'ASC']],
                    offset: offset,
                    limit: 100
                });

                res.send({ status: true, message: 'Messages fetched successfully.', data: messages });
            } catch (err) {
                console.error('Error fetching messages:', err);
                res.status(500).send({ status: false, message: 'An error occurred while fetching messages.', error: err.message });
            }
        }
    })

};

// Function to load all chats for a user
export const GetChatsList = async (req, res) => {
    JWT.verify(req.token, process.env.SecretJwtKey, async (error, authData) => {
        if (authData) {
            const userId = authData.user.id;

            try {
                const chats = await db.Chat.findAll({
                    include: [{
                        model: db.ChatUser,
                        as: 'ChatUser',
                        where: { userId: userId },
                        attributes: ["userId", "chatId"]
                    }]
                });

                console.log("Chats ", chats)
                let allChats = await ChatResource(chats, authData.user)
                res.send({ status: true, message: 'Chats fetched successfully.', data: allChats });
            } catch (err) {
                console.error('Error fetching chats:', err);
                res.status(500).send({ status: false, message: 'An error occurred while fetching chats.', error: err.message });
            }
        }
    })

};

// Function to delete a chat
export const DeleteChat = async (req, res) => {
    const { chatId } = req.params;

    try {
        const chat = await db.Chat.findByPk(chatId);
        if (chat) {
            return res.status(404).send({ status: false, message: 'Chat not found.' });
        }

        await chat.destroy();

        res.send({ status: true, message: 'Chat deleted successfully.' });
    } catch (err) {
        console.error('Error deleting chat:', err);
        res.status(500).send({ status: false, message: 'An error occurred while deleting the chat.', error: err.message });
    }
};

// Function to mark all messages in a chat as read
export const MarkAllMessagesRead = async (req, res) => {
    const { chatId, userId } = req.params;

    try {
        await db.Message.update({ isRead: true }, {
            where: {
                chatId,
                userId,
                isRead: false
            }
        });

        res.send({ status: true, message: 'All messages marked as read.' });
    } catch (err) {
        console.error('Error marking messages as read:', err);
        res.status(500).send({ status: false, message: 'An error occurred while marking messages as read.', error: err.message });
    }
};



// app.post('/createChat', createChat);
// app.put('/updateChat/:chatId', updateChat);
// app.post('/sendMessage/:chatId', sendMessage);
// app.get('/loadMessages/:chatId', loadMessages);
// app.get('/loadUserChats/:userId', loadUserChats);
// app.delete('/deleteChat/:chatId', deleteChat);
// app.put('/markAllMessagesRead/:chatId/:userId', markAllMessagesRead);


