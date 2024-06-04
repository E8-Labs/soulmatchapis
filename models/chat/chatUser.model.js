// models/ChatUser.js
const chatUserModel = (sequelize, Sequelize) => {
    const ChatUser = sequelize.define("ChatUser", {
        // chatId: {
        //     type: Sequelize.INTEGER,
        //     allowNull: false,
        //     references: {
        //         model: 'Chats',
        //         key: 'id'
        //     }
        // },
        userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        unread: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
        }
    });

    return ChatUser;
};

export default chatUserModel;
