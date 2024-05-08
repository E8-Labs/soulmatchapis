import dbConfig from "../config/db.config.js";
import passwordresetcodeModel from "./passwordresetcode.model.js";

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



import UserModel from "./user.model.js";


import chatModel from "./chat/chat.model.js";
import messageModel from "./chat/message.model.js";

import DailyLoginModel from "./dailylogin.model.js";
import NotificationModel from "./notification.model.js";
import emailVerificationCodeModel from "./emailverificationcode.model.js";



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

db.notification = NotificationModel(sequelize, Sequelize);


export default db;