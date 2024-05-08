import db from "../models/index.js";

import moment from "moment-timezone";
import UserProfileExtraLiteResource from "./userprofileextraextraliteresource.js";
// import LoanStatus from "../../models/loanstatus.js";
// import PlaidTokenTypes from "../../models/plaidtokentypes.js";
// import UserLoanFullResource from "../loan/loan.resource.js";
const Op = db.Sequelize.Op;

const NotificationResource = async (user, currentUser = null) => {
    if (!Array.isArray(user)) {
        ////console.log("Not array")
        return await getUserData(user, currentUser);
    }
    else {
        ////console.log("Is array")
        const data = []
        for (let i = 0; i < user.length; i++) {
            const p = await getUserData(user[i], currentUser)
            ////console.log("Adding to index " + i)
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

    let sub = await db.subscriptionModel.findOne({
        where: {
            UserId: user.id
        }
    })
    let plan = null
    if(sub){
        let p = JSON.parse(sub.data);
        console.log("User have subscription plan", p)
        plan = p;
    }
    

let text = ""
if(user.notification_type === "NewUser"){
    text = fromUser.first_name + " just signed up"
}
else if(user.notification_type === "Streak3"){
    text = fromUser.first_name + " is on 3 day streak"
}
else if(user.notification_type === "Streak30"){
    text = fromUser.first_name + " is on 30 day streak"
}
else if(user.notification_type === "NewJournal"){
    text = fromUser.first_name + " added a new journal"
}
else if(user.notification_type === "NewCheckIn"){
    text = fromUser.first_name + " just checked in"
}
    const UserFullResource = {
        id: user.id,
        from: await UserProfileExtraLiteResource(fromUser),
        to: await UserProfileExtraLiteResource(toUser),
        text: text,
        notification_type: user.notification_type,
        is_read: user.is_read,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    }


    return UserFullResource;
}

export default NotificationResource;