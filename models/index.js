import dbConfig from "../config/db.config.js";
import passwordresetcodeModel from "./user/passwordresetcode.model.js";

import  Sequelize from "sequelize";
//console.log("Connecting DB")
//console.log(dbConfig.MYSQL_DB_PASSWORD)
const sequelize = new Sequelize(dbConfig.MYSQL_DB, dbConfig.MYSQL_DB_USER, dbConfig.MYSQL_DB_PASSWORD, {
  host: dbConfig.MYSQL_DB_HOST,
  port: dbConfig.MYSQL_DB_PORT,
  dialect: dbConfig.dialect,
  logging: false
});


try {
  await sequelize.authenticate();
  //console.log('Connection has been established successfully.');
} catch (error) {
  console.error('Unable to connect to the database:', error);
}
const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;



import UserModel from "./user/user.model.js";


import chatModel from "./chat/chat.model.js";
import messageModel from "./chat/message.model.js";

import DailyLoginModel from "./user/dailylogin.model.js";
import NotificationModel from "./notification.model.js";
import emailVerificationCodeModel from "./user/emailverificationcode.model.js";
import UserMediaModel from "./user/usermedia.model.js";
import ProfileLikesModel from "./profilelikes.model.js";
import ProfileMatchesModel from "./profilematches.model.js";
import ProfileQuestionsModel from "./user/ProfileQuestions.model.js";
import UserAnswerModel from "./user/UserAnswer.model.js";



db.user = UserModel(sequelize, Sequelize);


//chat
db.chatModel = chatModel(sequelize, Sequelize);
db.chatModel.belongsTo(db.user);

db.messageModel = messageModel(sequelize, Sequelize);
db.messageModel.belongsTo(db.chatModel);



db.passwordResetCode = passwordresetcodeModel(sequelize, Sequelize);
db.emailVerificationCode = emailVerificationCodeModel(sequelize, Sequelize);


db.dailyLogin = DailyLoginModel(sequelize, Sequelize);
db.dailyLogin.belongsTo(db.user);
db.user.hasMany(db.dailyLogin);

db.userMedia = UserMediaModel(sequelize, Sequelize);
db.userMedia.belongsTo(db.user);
db.user.hasMany(db.userMedia);

db.notification = NotificationModel(sequelize, Sequelize);


db.profileLikes = ProfileLikesModel(sequelize, Sequelize);
if (db.profileLikes.associate) {
  db.profileLikes.associate(db);
}


db.profileMatches = ProfileMatchesModel(sequelize, Sequelize);
if (db.profileMatches.associate) {
  db.profileMatches.associate(db);
}

db.profileQuestions = ProfileQuestionsModel(sequelize, Sequelize);

db.userAnswers = UserAnswerModel(sequelize, Sequelize);

// Object.keys(db).forEach(modelName => {
//   if (db[modelName].associate) {
//       db[modelName].associate(db);
//   }
// });

export default db;