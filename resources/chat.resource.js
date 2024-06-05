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
    // console.log("Chat Users ", cusers)
    let chatUsers = []
    let myUnread = 0
    for (const element of cusers) {
        let chatUser = await db.user.findByPk(element.userId);
        console.log("Found Chat User ", chatUser);
        let userRes = await UserProfileExtraLiteResource(chatUser);
        chatUsers.push(userRes);
        if(element.userId === currentUser.id){
            myUnread = element.unread;
        }
    }
    let mess = await db.Message.findOne({
        where: {
            chatId: user.id
        },
        order: [["createdAt", "DESC"]],
        limit: 1
    })
    console.log("Sending back resource")
    const UserFullResource = {
        id: user.id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        users: chatUsers,
        unread: myUnread,
        lastMessage: mess
        
    }


    return UserFullResource;
}

export default ChatResource;