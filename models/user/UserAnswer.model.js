const UserAnswerModel = (sequelize, Sequelize) => {
    const UserAnswer = sequelize.define("UserAnswer", {
        UserId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        questionId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'profileQuestions',
                key: 'id'
            }
        },
        answerText: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        answerImage: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        answerVideo: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        videoThumbnail: {
            type: Sequelize.STRING,
            allowNull: true,
        }
    });

    UserAnswer.associate = (models) => {
        UserAnswer.belongsTo(models.User, {
            foreignKey: 'UserId',
            as: 'User'
        });
        UserAnswer.belongsTo(models.profileQuestions, {
            foreignKey: 'questionId',
            as: 'profileQuestions'
        });
    };

    return UserAnswer;
};

export default UserAnswerModel;
