// models/Message.js
const messageModel = (sequelize, Sequelize) => {
  const Message = sequelize.define("Message", {
      // chatId: {
      //     type: Sequelize.INTEGER,
      //     allowNull: false,
      //     references: {
      //         model: 'Chats',
      //         key: 'id'
      //     }
      // },
      // userId: {
      //     type: Sequelize.INTEGER,
      //     allowNull: false,
      //     references: {
      //         model: 'Users',
      //         key: 'id'
      //     }
      // },
      content: {
          type: Sequelize.STRING,
          allowNull: false
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
