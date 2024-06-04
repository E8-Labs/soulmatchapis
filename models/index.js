import dbConfig from "../config/db.config.js";
import passwordresetcodeModel from "./user/passwordresetcode.model.js";
import CategoryModel from "./date/category.model.js";
import DatePlaceModel from "./date/dateplace.model.js";
import BookingModel from './date/Booking.model.js'
import UserMediaModel from "./user/usermedia.model.js";

import chatModel from './chat/chat.model.js';
import chatUserModel from './chat/chatUser.model.js';
import messageModel from './chat/message.model.js';


import  Sequelize from "sequelize";
//console.log("Connecting DB")
//console.log(dbConfig.MYSQL_DB_PASSWORD)
const sequelize = new Sequelize(dbConfig.MYSQL_DB, dbConfig.MYSQL_DB_USER, dbConfig.MYSQL_DB_PASSWORD, {
  host: dbConfig.MYSQL_DB_HOST,
  port: dbConfig.MYSQL_DB_PORT,
  dialect: dbConfig.dialect,
  logging: true
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



import DailyLoginModel from "./user/dailylogin.model.js";
import emailVerificationCodeModel from "./user/emailverificationcode.model.js";
import ProfileLikesModel from "./profilelikes.model.js";
import ProfileMatchesModel from "./profilematches.model.js";
import ProfileQuestionsModel from "./user/ProfileQuestions.model.js";
import UserAnswerModel from "./user/UserAnswer.model.js";
import NotificationModel from './user/notification.model.js';


db.user = UserModel(sequelize, Sequelize);


//chat
db.Chat = chatModel(sequelize, Sequelize);
db.ChatUser = chatUserModel(sequelize, Sequelize);
db.Message = messageModel(sequelize, Sequelize);

db.Chat.belongsToMany(db.user, { through: db.ChatUser, foreignKey: 'chatId', otherKey: 'userId' });
// db.user.belongsToMany(db.Chat, { through: db.user, foreignKey: 'userId', otherKey: 'chatId' });

db.Chat.hasMany(db.ChatUser, { foreignKey: 'chatId', as: "ChatUser" });
db.ChatUser.belongsTo(db.Chat, { foreignKey: 'chatId', as: "Chat" });

db.Chat.hasMany(db.Message, { foreignKey: 'chatId' });
db.Message.belongsTo(db.Chat, { foreignKey: 'chatId' });

db.user.hasMany(db.Message, { foreignKey: 'userId' });
db.Message.belongsTo(db.user, { foreignKey: 'userId' });


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

db.Category = CategoryModel(sequelize, Sequelize);
db.DatePlace = DatePlaceModel(sequelize, Sequelize);

db.DatePlace.associate(db);

db.Booking = BookingModel(sequelize, Sequelize);

db.NotificationModel = NotificationModel(sequelize, Sequelize);
db.user.hasMany(db.NotificationModel, { foreignKey: 'to', as: 'receivedNotifications' });
db.NotificationModel.belongsTo(db.user, { foreignKey: 'to', as: 'toUser' });

db.user.hasMany(db.NotificationModel, { foreignKey: 'from', as: 'sentNotifications' });
db.NotificationModel.belongsTo(db.user, { foreignKey: 'from', as: 'fromUser' });

export default db;