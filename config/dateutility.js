const addDays = (date, days) => {
    const copy = new Date(date.getTime());
    copy.setDate(copy.getDate() + days);
    return copy;
};

const currentDate = () => {
    var today = new Date();
    return today
}


const dateToString = (date) => {
    
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const day = date.getDate();
    const currentDate = month + "/" + day + "/" + year;
    return currentDate
}

export { addDays, currentDate, dateToString }