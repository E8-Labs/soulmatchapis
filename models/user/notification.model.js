let NotificationModel = (sequelize, Sequelize) => {
    const Model = sequelize.define("Notification", {
      to: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    from: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
      itemId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      notification_type: {
        type: Sequelize.STRING,
      },
      message: {
        type: Sequelize.STRING,
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