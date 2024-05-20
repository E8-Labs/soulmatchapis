let UserAnswerModel = (sequelize, Sequelize) => {
    const UserAnswer = sequelize.define("UserAnswer", {
        UserId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'Users', // Adjust as necessary to match your User model's table name
                key: 'id'
            }
        },
        questionId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'ProfileQuestions', // Now correctly referencing the ProfileQuestions table
                key: 'id'
            }
        },
        answerText: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        answerImage: {
            type: Sequelize.STRING, // URL to the image
            allowNull: true,
        },
        answerVideo: {
            type: Sequelize.STRING, // URL to the video
            allowNull: true,
        },
        videoThumbnail: {
            type: Sequelize.STRING, // URL to the video thumbnail
            allowNull: true,
        }
    }, {
        // Other model options go here
    });
 
    UserAnswer.associate = (models) => {
        UserAnswer.belongsTo(models.User, {
            foreignKey: 'UserId',
            as: 'User'
        });
        UserAnswer.belongsTo(models.Question, {
            foreignKey: 'questionId',
            as: 'ProfileQuestions'
        });
    };

    return UserAnswer;
};

export default UserAnswerModel;
