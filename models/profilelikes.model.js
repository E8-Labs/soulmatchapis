let ProfileLikesModel = (sequelize, Sequelize) => {
    const ProfileLikes = sequelize.define("ProfileLikes", {
        from:{
            type: Sequelize.INTEGER,
            references: {
                model: 'Users', // This is the name of the table, make sure it matches your User model definition
                key: 'id'
            }
        },
      to: {
        type: Sequelize.INTEGER,
        references: {
            model: 'Users', // This is the name of the table, make sure it matches your User model definition
            key: 'id'
        }
      },
      status: {
        type: Sequelize.ENUM,
        values: ['liked', 'rejected'],
      },
      AnswerId: {
        type: Sequelize.INTEGER,
        references: {
            model: 'UserAnswers', // This is the name of the table, make sure it matches your User model definition
            key: 'id'
        },
        allowNull: true,
        default: null,
        
      },
      comment:{
        type: Sequelize.STRING,
        default: ''
      }
      
    });
    // Chat.belongsTo(User);
    // Chat.belongsTo(Prompt)
    // ProfileLikes.associate = (models) => {
    //     ProfileLikes.belongsTo(models.User, {
    //         as: 'FromUser',
    //         foreignKey: 'from'
    //     });
    //     ProfileLikes.belongsTo(models.User, {
    //         as: 'ToUser',
    //         foreignKey: 'to'
    //     });
    // };
    return ProfileLikes;
  };
  export default ProfileLikesModel;