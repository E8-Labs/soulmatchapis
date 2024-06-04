// models/Chat.js
const chatModel = (sequelize, Sequelize) => {
  const Chat = sequelize.define("Chat", {
      name: {
          type: Sequelize.STRING,
          allowNull: true
      }
  });

  return Chat;
};

export default chatModel;
