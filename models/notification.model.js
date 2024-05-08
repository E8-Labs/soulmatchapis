let NotificationModel = (sequelize, Sequelize) => {
    const Model = sequelize.define("Notification", {
        from:{
            type: Sequelize.INTEGER,
        },
      to: {
        type: Sequelize.INTEGER,
      },
      notification_type: {
        type: Sequelize.ENUM,
        values: ['NewUser'],
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      }
      
    });
    // Chat.belongsTo(User);
    // Chat.belongsTo(Prompt)
    return Model;
  };
  export default NotificationModel;