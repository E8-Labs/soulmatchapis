
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
      product: Sequelize.STRING,
      originalPurchaseDate:{
        type: Sequelize.STRING,
        defaultValue: '',
      }
    });
  
    // Boost.associate = (models) => {
    //     Boost.belongsTo(models.User, { foreignKey: 'userId' });
    // };
  
    return Boost;
  };
  
  export default Boost;
  
  