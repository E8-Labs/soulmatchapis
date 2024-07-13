import db from "../models/index.js";

import moment from "moment-timezone";
import { getSubscriptionDetails } from "../services/subscriptionService.js";
import { isProfileBoosted } from "../controllers/subscription.controller.js";
// import LoanStatus from "../../models/loanstatus.js";
// import PlaidTokenTypes from "../../models/plaidtokentypes.js";
// import UserLoanFullResource from "../loan/loan.resource.js";
const Op = db.Sequelize.Op;

const UserProfileFullResource = async (user, currentUser = null) => {
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



    let profileCompletion = 1;// user have completed registration, take him to intro
    let comment = ""


    

    if (user.intro_video != "" && user.intro_video != null) {
        profileCompletion = 2;// user have completed intro video
        comment = "Take user to Add Media screen";
    }
    let userMedia = await db.userMedia.findAll({
        where: {
            UserId: user.id
        }
    })
    if (userMedia && userMedia.length > 0) {
        profileCompletion = 3;// user have completed media
        comment = "Take user to Add Profile questions screen";
    }
    if (user.zodiac != "" && user.zodiac != null) {
        profileCompletion = 4; // user have completed zodiac
        comment = "Take user to Add age screen";
    }
    if (user.age != "" && user.age != null) {
        profileCompletion = 5;// user have completed age
        comment = "Take user to Add height screen";
    }
    if (user.height_inches != "" && user.height_inches != null) {
        profileCompletion = 6;// user have completed height
        comment = "Take user to Add gender screen";
    }
    if (user.gender != "" && user.gender != null) {
        profileCompletion = 7;// user have completed gender
        comment = "Take user to Add school screen";
    }

    if (user.school != "" && user.school != null) {
        profileCompletion = 8;// user have completed school
        comment = "Take user to Add Work screen";
    }
    if (user.job_title != "" && user.job_title != null) {
        profileCompletion = 9;// user have completed work screen
        comment = "Take user to Add interests screen";
    }
    if ((user.interested_min_age != "" && user.interested_min_age != null) && (user.interested_max_age != "" && user.interested_max_age != null)
        && (user.interested_gender != "" && user.interested_gender != null)) {
        profileCompletion = 10;// user have completed Interests screen
        comment = "Take user to Profile Questions screen";
    }
    let questions = db.userAnswers.findAll({
        where:{
            UserId: user.id
        }
    })

    if (questions && questions.length > 0) {
        profileCompletion = 11;// user have completed profile questions
        comment = "Take user to Add Location";
    }

    if ((user.lat != "" && user.lat != null) && (user.lang != "" && user.lang != null)) {
        profileCompletion = 20;// user have completed Interests screen
        comment = "Take user to Dashboard screen";
    }
    const query = `
    SELECT 
        ua.*, 
        pq.title, 
        pq.text 
    FROM 
        UserAnswers ua
    JOIN 
        ProfileQuestions pq 
    ON 
        ua.questionId = pq.id
    WHERE 
        ua.UserId = :userId
    ORDER BY 
        ua.createdAt DESC
    LIMIT 3 
`;

    const answers = await db.sequelize.query(query, {
        replacements: { userId: user.id },
        type: db.sequelize.QueryTypes.SELECT
    });

    let isLiked = false;
    if(currentUser){
        const likes = await db.profileLikes.findOne({
            where: {
                to: user.id,
                status: 'liked',
                from: currentUser.id
            }
        });
        if(likes){
            isLiked = true;
        }
    }


    var blockedByMe = false;
    if(currentUser){
        const blockedEntry = await db.BlockedUsers.findOne({
            where:{
                blockedUserId: user.id,
                blockingUserId: currentUser.id
            }
        })
        if(blockedEntry){
            blockedByMe = true;
        }
    }

    var blockedMe = false;
    if(currentUser){
        const blockedEntry = await db.BlockedUsers.findOne({
            where:{
                blockedUserId: currentUser.id,
                blockingUserId: user.id,
            }
        })
        if(blockedEntry){
            blockedMe = true;
        }
    }




    const subscriptionDetails = await getSubscriptionDetails(user);



    const matchesCount = await db.profileMatches.count({
        where: {
          [db.Sequelize.Op.or]: [
            { user_1_id: user.id },
            { user_2_id: user.id }
          ]
        }
      });

    const UserFullResource = {
        id: user.id,
        name: user.firstname,
        profile_image: user.profile_image,
        full_profile_image: user.full_profile_image,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        state: user.state,
        role: user.role,
        city: user.city,
        lat: user.lat,
        lang: user.lang,
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
        interested_max_age: user.interested_max_age,
        interested_min_age: user.interested_min_age,
        interested_gender: user.interested_gender,
        media: userMedia,
        isLiked: isLiked,
        blockedMe: blockedMe,
        blockedByMe: blockedByMe,
        status: user.status,
        subscription: subscriptionDetails,
        totalMatches: matchesCount,
        isProfileBoosted: await isProfileBoosted(user.id)
    }


    return UserFullResource;
}

export default UserProfileFullResource;