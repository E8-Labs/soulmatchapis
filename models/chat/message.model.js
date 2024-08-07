// models/Message.js
const messageModel = (sequelize, Sequelize) => {
    const Message = sequelize.define("Message", {
        chatId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'Chats',
                key: 'id'
            }
        },
        userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        content: {
            type: Sequelize.STRING,
            allowNull: false
        },
        message_type: {
            type: Sequelize.ENUM,
            values: ['image', 'text', 'video', 'voice'],
            default: 'text'
        },
        video_url:{
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: null,
        },
        image_url: {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: null,
        },
        image_thumb_url: {  //image thumb url
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: null,
        },
        thumb_url: {  //video thumb url
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: null,
        },
        image_height: {
            type: Sequelize.INTEGER,
            default: 200
        },
        image_width: {
            type: Sequelize.INTEGER,
            default: 200
        },
        voice: {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: null,
        },
        isRead: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    });

    return Message;
};

export default messageModel;
