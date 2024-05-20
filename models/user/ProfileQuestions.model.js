let ProfileQuestionsModel = (sequelize, Sequelize) => {
    const Questions = sequelize.define("ProfileQuestions", {
        title: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        text: {
            type: Sequelize.STRING,
            allowNull: false,
        }
    }, {
        // Other model options go here
    });

    return Questions;
};

export default ProfileQuestionsModel;
