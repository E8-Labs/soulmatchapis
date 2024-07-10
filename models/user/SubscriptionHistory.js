

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
          autoRenewStatus:{
            type: Sequelize.INTEGER,
            defaultValue: null,
            allowNull: true,
          },
          environment:{
            type: Sequelize.STRING,
            defaultValue: 'sandbox',
          },
          price: {
            type: Sequelize.DOUBLE,
            defaultValue: 0,
          },
          status: Sequelize.STRING,
          nottype:{
            type: Sequelize.STRING,
            defaultValue: '',
          },
          subtype:{
            type: Sequelize.STRING,
            defaultValue: '',
          },
          changeDate: Sequelize.DATE,
    });

    

    return SubscriptionHistory;
};

export default SubscriptionHistory;

