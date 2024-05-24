const profileQuestionsModel = (sequelize, Sequelize) => {
    const profileQuestions = sequelize.define("profileQuestions", {
        title: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        text: {
            type: Sequelize.STRING,
            allowNull: false,
        }
    });

    profileQuestions.associate = (models) => {
        profileQuestions.hasMany(models.UserAnswer, {
            foreignKey: 'questionId',
            as: 'userAnswers'
        });
    };

    return profileQuestions;
};

export default profileQuestionsModel;
