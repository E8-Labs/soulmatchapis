import db from "../models/index.js";

import moment from "moment-timezone";
// import LoanStatus from "../../models/loanstatus.js";
// import PlaidTokenTypes from "../../models/plaidtokentypes.js";
// import UserLoanFullResource from "../loan/loan.resource.js";
const Op = db.Sequelize.Op;

const UserProfileFullResource = async (user, currentUser = null) => {
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



    let profileCompletion = 1;// user have completed registration, take him to intro
    let comment = ""
    if(user.intro_video != "" && user.intro_video != null){
        profileCompletion = 2;// user have completed intro video
        comment = "Take user to Add Media screen";
    }
    let userMedia = await db.userMedia.findAll({
        where: {
            UserId: user.id
        }
    })
    if(userMedia && userMedia.length > 0){
        profileCompletion = 3;// user have completed media
        comment = "Take user to Add zodiac screen";
    }
    if(user.zodiac != "" && user.zodiac != null){
        profileCompletion = 4; // user have completed zodiac
        comment = "Take user to Add age screen";
    }
    if(user.age != "" && user.age != null){
        profileCompletion = 5;// user have completed age
        comment = "Take user to Add height screen";
    }
    if(user.height_feet != "" && user.height_feet != null){
        profileCompletion = 6;// user have completed height
        comment = "Take user to Add gender screen";
    }
    if(user.gender != "" && user.gender != null){
        profileCompletion = 7;// user have completed gender
        comment = "Take user to Add school screen";
    }

    if(user.school != "" && user.school != null){
        profileCompletion = 8;// user have completed school
        comment = "Take user to Add Work screen";
    }
    if(user.job_title != "" && user.job_title != null){
        profileCompletion = 9;// user have completed work screen
        comment = "Take user to Add interests screen";
    }


    let answers = await db.userAnswers.findAll({
        where: {
            UserId: user.id
        }
    })
    
    const UserFullResource = {
        id: user.id,
        name: user.firstname,
        profile_image: user.profile_image,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        state: user.state,
        role: user.role,
        city: user.city,
        provider_id: user.provider_id,
        provider_name: user.provider_name,
        dob: user.dob,
        zodiac: user.zodiac,
        age: user.age,
        gender: user.gender,
        job_title: user.job_title,
        company: user.company,
        height_inches: user.height_inches,
        height_feet: user.height_feet,
        school: user.school,
        intro_video: user.intro_video,
        intro_video_thumbnail: user.intro_thumbnail_url,
        profile_completion: profileCompletion,
        profile_completion_comment: comment,
        answers: answers,
    }


    return UserFullResource;
}

export default UserProfileFullResource;