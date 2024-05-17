let ProfileMatchesModel = (sequelize, Sequelize) => {
    const ProfileMatches = sequelize.define("ProfileMatches", {
        user_1_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'Users', // This should match the table name as Sequelize sees it
                key: 'id'
            }
        },
        user_2_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        status: {
            type: Sequelize.ENUM('matched', 'unmatched'),
            allowNull: false,
            defaultValue: 'matched'
        }
    });

    // Associations can optionally be defined here if needed
    // ProfileMatches.associate = (models) => {
    //     ProfileMatches.belongsTo(models.User, { as: 'User1', foreignKey: 'user_1_id' });
    //     ProfileMatches.belongsTo(models.User, { as: 'User2', foreignKey: 'user_2_id' });
    // };

    return ProfileMatches;
};

export default ProfileMatchesModel;
