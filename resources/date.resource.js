// resources/booking.resource.js
import db from "../models/index.js";
import ReviewResource from "./review.resource.js";
// import UserProfileExtraLiteResource from "./userprofileextraextraliteresource.js";

const DateResource = async (booking) => {
    if (!Array.isArray(booking)) {
        return await getDateData(booking);
    } else {
        const data = [];
        for (let i = 0; i < booking.length; i++) {
            const b = await getDateData(booking[i]);
            data.push(b);
        }
        return data;
    }
}

async function getDateData(booking) {
    // const user = await db.user.findByPk(booking.userId);
    // const dateUser = booking.dateUserId ? await db.user.findByPk(booking.dateUserId) : null;
    // const datePlace = await db.DatePlace.findByPk(booking.datePlaceId);
    let cat = await db.Category.findByPk(booking.CategoryId);
    let reviews = await db.DateReview.findAll({
        where: {
            placeId: booking.id
        }
    })

    let reviewsRes = null
    if(reviews){
        reviewsRes = await ReviewResource(reviews)
    }
    const result = await db.DateReview.findOne({
        attributes: [[db.Sequelize.fn('AVG', db.Sequelize.col('rating')), 'avgRating']],
        where: {
          placeId: booking.id
        },
        raw: true
      });
  
      const averageRating = result.avgRating;
    const BookingFullResource = {
        id: booking.id,
        name: booking.name,
        imageUrl: booking.imageUrl,
        address: booking.address,
        "minBudget": booking.minBudget,
        "maxBudget": booking.maxBudget,
        "openTime": booking.openTime,
        "closeTime": booking.closeTime,
        "latitude": booking.latitude,
        "longitude": booking.longitude,
        "city": booking.city,
        "state": booking.state,
        "rating": averageRating || 0, //calculate from the reviews model
        "description": booking.description,
        "createdAt": booking.createdAt,
        "updatedAt": booking.updatedAt,
        "CategoryId": booking.CategoryId,
        Category: {name: cat.name, id: cat.id},
        reviews: reviewsRes || [],

    }

    return BookingFullResource;
}

export default DateResource;
