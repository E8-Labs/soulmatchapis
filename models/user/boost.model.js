
// models/ReportedUsers.js
const Boost = (sequelize, Sequelize) => {
    const Boost = sequelize.define("Boost", {
      userId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id'
          }
        },
    //   originalTransactionId: {
    //     type: Sequelize.STRING,
    //     default: ''
    //   },
    //   originalPurchaseDate: {
    //     type: Sequelize.STRING,
    //     default: ''
    //   },
      product: Sequelize.STRING,
    //   status: Sequelize.STRING,
    startDate: {
        type: Sequelize.STRING,
        defaultValue: ''
      },
      endDate: {
        type: Sequelize.STRING,
        defaultValue: ''
      },
    });
  
    
  
    return Boost;
  };
  
  export default Boost;
  
  