// resources/booking.resource.js
import db from "../models/index.js";
import UserProfileExtraLiteResource from "./userprofileextraextraliteresource.js";
// import UserProfileExtraLiteResource from "./userprofileextraextraliteresource.js";

const ReviewResource = async (booking) => {
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
    const user = await db.user.findByPk(booking.userId);
    
    
    const BookingFullResource = {
        id: booking.id,
        rating: booking.rating,
        review: booking.review,
        user: await UserProfileExtraLiteResource(user)

    }

    return BookingFullResource;
}

export default ReviewResource;
