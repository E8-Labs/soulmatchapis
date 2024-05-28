// models/Category.js
const CategoryModel = (sequelize, Sequelize) => {
    const Category = sequelize.define("Category", {
        name: {
            type: Sequelize.STRING,
            allowNull: false
        }
    });

    return Category;
};

export default CategoryModel;
