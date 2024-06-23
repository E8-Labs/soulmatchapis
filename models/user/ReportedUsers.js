// models/ReportedUsers.js
const ReportedUsersModel = (sequelize, Sequelize) => {
    const ReportedUsers = sequelize.define("ReportedUsers", {
        reportedUserId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'Users', // This should match your User model table name
                key: 'id'
            }
        },
        reportingUserId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'Users', // This should match your User model table name
                key: 'id'
            }
        },
        reportReason: {
            type: Sequelize.STRING,
            allowNull: false
        }
    });

    ReportedUsers.associate = (models) => {
        ReportedUsers.belongsTo(models.User, {
            as: 'ReportedUser',
            foreignKey: 'reportedUserId'
        });
        ReportedUsers.belongsTo(models.User, {
            as: 'ReportingUser',
            foreignKey: 'reportingUserId'
        });
    };

    return ReportedUsers;
};

export default ReportedUsersModel;
