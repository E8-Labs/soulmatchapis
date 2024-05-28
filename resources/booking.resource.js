// resources/booking.resource.js
import db from "../models/index.js";
import UserProfileExtraLiteResource from "./userprofileextraextraliteresource.js";

const BookingResource = async (booking) => {
    if (!Array.isArray(booking)) {
        return await getBookingData(booking);
    } else {
        const data = [];
        for (let i = 0; i < booking.length; i++) {
            const b = await getBookingData(booking[i]);
            data.push(b);
        }
        return data;
    }
}

async function getBookingData(booking) {
    const user = await db.user.findByPk(booking.userId);
    const dateUser = booking.dateUserId ? await db.user.findByPk(booking.dateUserId) : null;
    const datePlace = await db.DatePlace.findByPk(booking.datePlaceId);

    const BookingFullResource = {
        id: booking.id,
        user: user ? await UserProfileExtraLiteResource(user) : null,
        datePlace: datePlace ? {
            id: datePlace.id,
            name: datePlace.name,
            imageUrl: datePlace.imageUrl,
            address: datePlace.address
        } : null,
        date: booking.date,
        time: booking.time,
        numberOfGuests: booking.numberOfGuests,
        dateUser: dateUser ? await UserProfileExtraLiteResource(dateUser) : null
    }

    return BookingFullResource;
}

export default BookingResource;
