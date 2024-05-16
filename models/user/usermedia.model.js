// const { Sequelize } = require(".");
const UserMediaModel  = (sequelize, Sequelize) => {
    const PasswordResetCode = sequelize.define("UserMedia", {
      url: {
        type: Sequelize.STRING,
      },
      thumb_url: {
        type: Sequelize.STRING,
      },
      caption: {
        type: Sequelize.STRING,
      },
      type: {
        type: Sequelize.ENUM,
        values: ['image', 'video'],
        default: 'image'
      },
      
    })
      
    return PasswordResetCode;
  };

  export default UserMediaModel;