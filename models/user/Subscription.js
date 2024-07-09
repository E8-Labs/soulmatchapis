
// models/ReportedUsers.js
const Subscription = (sequelize, Sequelize) => {
    const Subscription = sequelize.define("Subscription", {
        userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'Users',
              key: 'id'
            }
          },
          plan: Sequelize.STRING,
          status: Sequelize.STRING,
          startDate: Sequelize.DATE,
          endDate: Sequelize.DATE,
    });

    

    return Subscription;
};

export default Subscription;

