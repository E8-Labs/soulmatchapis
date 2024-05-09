// const { Sequelize } = require(".");
const passwordresetcodeModel  = (sequelize, Sequelize) => {
    const PasswordResetCode = sequelize.define("PasswordResetCode", {
      email: {
        type: Sequelize.STRING,
        // references: {
        //     model: User,
        //     key: 'id',
        // }
      },
      code: {
        type: Sequelize.STRING
      },
      
    })
      
    return PasswordResetCode;
  };

  export default passwordresetcodeModel;