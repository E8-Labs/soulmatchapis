let messageModel = (sequelize, Sequelize) => {
    const Message = sequelize.define("Message", {
      
      message: {
        type: Sequelize.STRING(5000)
      },
      title: {
        type: Sequelize.STRING(5000),
        default: ''
      },
      from: {
        type: Sequelize.STRING(30),
        default: "me"
      },
      type: {
        type: Sequelize.STRING(30), 
        default: "text" // text, prompt(if it is prompt sent directly)
      },
      tokens: {
        type: Sequelize.INTEGER, 
        default: 0
      }
      
    });
    // Message.belongsTo(User);
    // Message.belongsTo(Chat);
    return Message;
  };

  export default messageModel