import db from '../models/index.js'
import JWT from "jsonwebtoken";
import bcrypt from 'bcrypt';
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





// const  ChatResource = require("../resources/chat/chatresource")
// const  MessageResource = require("../resources/chat/messageresource");
// const e = require("express");

// controllers/chatController.js
// import db from '../models'; // Adjust the path according to your project structure

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
                if(result.length == 0){
                    const chat = await db.Chat.create({ name: "" });

                    // Add users to chat
                    for (const userId of userIds) {
                        await db.ChatUser.create({ chatId: chat.id, userId });
                    }

                    const chatData = await ChatResource(chat, authData.user);
                    res.send({ status: true, message: 'Chat created successfully.', data: chatData });
                }
                else{
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
                const message = await db.Message.create({ chatId: chatId, userId: authData.user.id, content: content });
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
                if(chatUsers.length > 0){
                    chatUsers.forEach(async element => {
                        console.log("Sending notification to ", element.userId)
                        pusher.trigger(`chat-channel-${chatId}`, `new-message`, message);
                        let created = await createNotification(message.id, element.userId, authData.user.id, NotificationType.TypeMessage);
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

export async function TestPusher(req, res){
    let message = req.body.message;
    pusher.trigger(`my-channel`, `new-message`, {message: message});
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


