// const { Sequelize } = require(".");
const UserMediaModel  = (sequelize, Sequelize) => {
    const PasswordResetCode = sequelize.define("UserMedia", {
      url: { // we store the full size image or video here
        type: Sequelize.STRING,
      },
      thumb_url: { // If it is a video then we store here the thumbnail. If it is an image then we store here thumbnail size image.
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