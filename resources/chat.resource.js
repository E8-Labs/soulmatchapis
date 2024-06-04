import db from "../models/index.js";

import moment from "moment-timezone";
import UserProfileExtraLiteResource from "./userprofileextraextraliteresource.js";
// import LoanStatus from "../../models/loanstatus.js";
// import PlaidTokenTypes from "../../models/plaidtokentypes.js";
// import UserLoanFullResource from "../loan/loan.resource.js";
const Op = db.Sequelize.Op;

const ChatResource = async (user, currentUser = null) => {
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

    let cusers = await db.ChatUser.findAll({where: {chatId: user.id}});
    let chatUsers = []
    if(cusers.length > 0){
        cusers.forEach(async element => {
            let user = await db.user.findByPk(element.userId)
            let userRes = await UserProfileExtraLiteResource(user)
            chatUsers.push(userRes)
        });
    }
    const UserFullResource = {
        id: user.id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        users: chatUsers
        
    }


    return UserFullResource;
}

export default ChatResource;