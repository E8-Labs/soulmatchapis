// models/DatePlace.js
const DatePlaceModel = (sequelize, Sequelize) => {
    const DatePlace = sequelize.define("DatePlace", {
        name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        imageUrl: {
            type: Sequelize.STRING,
            allowNull: true
        },
        minBudget: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        maxBudget: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        openTime: {
            type: Sequelize.TIME,
            allowNull: false
        },
        closeTime: {
            type: Sequelize.TIME,
            allowNull: false
        },
        address: {
            type: Sequelize.STRING,
            allowNull: false
        },
        latitude: {
            type: Sequelize.DOUBLE,
            allowNull: false
        },
        longitude: {
            type: Sequelize.DOUBLE,
            allowNull: false
        },
        city: {
            type: Sequelize.STRING,
            default: ''
          },
          state: {
            type: Sequelize.STRING,
            default: ''
          },
          rating: {
            type: Sequelize.DOUBLE,
            default: 5,
            allowNull: false
          },
        description: {
            type: Sequelize.TEXT,
            allowNull: true
        }
    });

    DatePlace.associate = (models) => {
        DatePlace.belongsTo(models.Category, {
            foreignKey: {
                allowNull: false
            }
        });
        
    };

    return DatePlace;
};

export default DatePlaceModel;
