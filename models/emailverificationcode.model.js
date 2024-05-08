// const { Sequelize } = require(".");
const emailVerificationCodeModel  = (sequelize, Sequelize) => {
    const PasswordResetCode = sequelize.define("EmailVerificationCode", {
      email: {
        type: Sequelize.STRING,
      },
      code: {
        type: Sequelize.STRING
      },
      
    })
      
    return PasswordResetCode;
  };

  export default emailVerificationCodeModel;