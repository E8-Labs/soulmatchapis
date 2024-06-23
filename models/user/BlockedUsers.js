// models/BlockedUsers.js
const BlockedUsersModel = (sequelize, Sequelize) => {
    const BlockedUsers = sequelize.define("BlockedUsers", {
        blockedUserId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'Users', // This should match your User model table name
                key: 'id'
            }
        },
        blockingUserId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'Users', // This should match your User model table name
                key: 'id'
            }
        },
        blockReason: {
            type: Sequelize.STRING,
            allowNull: false
        }
    });

    BlockedUsers.associate = (models) => {
        BlockedUsers.belongsTo(models.User, { as: 'BlockedUser', foreignKey: 'blockedUserId' });
        BlockedUsers.belongsTo(models.User, { as: 'BlockingUser', foreignKey: 'blockingUserId' });
    };

    return BlockedUsers;
};

export default BlockedUsersModel;
