

// models/ReportedUsers.js
const SubscriptionHistory = (sequelize, Sequelize) => {
    const SubscriptionHistory = sequelize.define("SubscriptionHistory", {
        subscriptionId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'Subscriptions',
              key: 'id'
            }
          },
          status: Sequelize.STRING,
          changeDate: Sequelize.DATE,
    });

    

    return SubscriptionHistory;
};

export default SubscriptionHistory;

