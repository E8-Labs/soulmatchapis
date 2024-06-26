import db from "../models/index.js";

import moment from "moment-timezone";
// import LoanStatus from "../../models/loanstatus.js";
// import PlaidTokenTypes from "../../models/plaidtokentypes.js";
// import UserLoanFullResource from "../loan/loan.resource.js";
const Op = db.Sequelize.Op;

const UserProfileExtraLiteResource = async (user, currentUser = null) => {
    if (!Array.isArray(user)) {
        //////console.log("Not array")
        return await getUserData(user, currentUser);
    }
    else {
        //////console.log("Is array")
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


   
    const UserFullResource = {
        id: user.id,
        profile_image: user.profile_image,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        state: user.state,
        role: user.role,
        city: user.city,
    }


    return UserFullResource;
}

export default UserProfileExtraLiteResource;