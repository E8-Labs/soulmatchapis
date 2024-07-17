import db from "../models/index.js";

import moment from "moment-timezone";
import UserProfileExtraLiteResource from "./userprofileextraextraliteresource.js";
import BookingResource from "./booking.resource.js";
import ChatResource from "./chat.resource.js";
// import LoanStatus from "../../models/loanstatus.js";
// import PlaidTokenTypes from "../../models/plaidtokentypes.js";
// import UserLoanFullResource from "../loan/loan.resource.js";
const Op = db.Sequelize.Op;

const NotificationResource = async (user, currentUser = null) => {
    if (!Array.isArray(user)) {
        return await getUserData(user, currentUser);
    }
    else {
        const data = []
        for (let i = 0; i < user.length; i++) {
            const p = await getUserData(user[i], currentUser)
            //////console.log("Adding to index " + i)
            data.push(p);
        }
        return data;
    }
}

async function getUserData(user, currentUser = null) {

    let fromUser = await db.user.findOne({
        where: {
            id: user.from
        }
    })

    let toUser = await db.user.findOne({
        where: {
            id: user.to
        }
    })

    // let sub = await db.subscriptionModel.findOne({
    //     where: {
    //         UserId: user.id
    //     }
    // })
    // let plan = null
    // if (sub) {
    //     let p = JSON.parse(sub.data);
    //     //console.log("User have subscription plan", p)
    //     plan = p;
    // }


    let chat = null
    let booking = null

    let text = ""
    if (user.notification_type == "Message") {
        console.log("Not type is ", user.notification_type)
        let m = await db.Message.findByPk(user.itemId)
        if(m){
            let c = await db.Chat.findOne({
                where: { id: m.chatId }
            })
            
            if(c){
                console.log("Chat is ", c)
                chat = await ChatResource(c, currentUser)
            }
        }
    }
    else if (user.notification_type == "DateInvite" || user.notification_type === "DateInviteToAdmin") {
        console.log("Not type is ", user.notification_type)
        let date = await db.Booking.findOne({
            where: {
                id: user.itemId
            }
        })
        if(date){
            booking = await BookingResource(date)
        }
    }
    // else if (user.notification_type === "Streak30") {
    //     text = fromUser.first_name + " is on 30 day streak"
    // }
    // else if (user.notification_type === "NewJournal") {
    //     text = fromUser.first_name + " added a new journal"
    // }
    // else if (user.notification_type === "NewCheckIn") {
    //     text = fromUser.first_name + " just checked in"
    // }


    

    const UserFullResource = {
        id: user.id,
        from: await UserProfileExtraLiteResource(fromUser),
        to: await UserProfileExtraLiteResource(toUser),
        text: text,
        notification_type: user.notification_type,
        is_read: user.is_read,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        chat: chat,
        booking: booking,
    }


    return UserFullResource;
}

export default NotificationResource;