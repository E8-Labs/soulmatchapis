const DateReview = (sequelize, Sequelize) => {
    const DateReview = sequelize.define("DateReview", {
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      placeId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'DatePlaces',
          key: 'id'
        }
      },
      review: {
        type: Sequelize.STRING,
        allowNull: false
      },
      rating: {
        type: Sequelize.DOUBLE,
        defaultValue: 5, // Use defaultValue instead of default
        allowNull: false
      }
    });
  
    return DateReview;
  };
  
  export default DateReview;
  