// models/Booking.js
const BookingModel = (sequelize, Sequelize) => {
    const Booking = sequelize.define("Booking", {
        userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        datePlaceId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'DatePlaces',
                key: 'id'
            }
        },
        date: {
            type: Sequelize.DATEONLY,
            allowNull: false
        },
        time: {
            type: Sequelize.TIME,
            allowNull: false
        },
        numberOfGuests: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        dateUserId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        }
    });

    Booking.associate = (models) => {
        Booking.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
        Booking.belongsTo(models.User, { foreignKey: 'dateUserId', as: 'dateUser' });
        Booking.belongsTo(models.DatePlace, { foreignKey: 'datePlaceId', as: 'datePlace' });
    };

    return Booking;
};

export default BookingModel;
