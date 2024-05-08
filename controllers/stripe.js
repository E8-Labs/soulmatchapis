import StripeSdk from 'stripe'
import axios from 'axios';
import qs from 'qs'


export const SubscriptionTypesSandbox = [
    { type: "Monthly", price: 19.99, id: "price_1PBeaHB5evLOKOQy7eCxKp1l", environment: "Sandbox" },
    { type: "HalfYearly", price: 100, id: "price_1PBebWB5evLOKOQyCNx2ISuW", environment: "Sandbox" },
    { type: "Yearly", price: 49.99, id: "price_1PBebjB5evLOKOQynjl9AAOO", environment: "Sandbox" },
]

//update the subscription ids here to live ones
export const SubscriptionTypesProduction = [
    { type: "Monthly", price: 19.99, id: "price_1P9VnxB5evLOKOQyP1MYmcuc", environment: "Production" },
    { type: "HalfYearly", price: 100, id: "price_1P9Vp7B5evLOKOQyPWnc2OA6", environment: "Production" },
    { type: "Yearly", price: 49.99, id: "price_1P9VrLB5evLOKOQykDvowoG5", environment: "Production" },
]


export const createCustomer = async (user) => {

    let key = process.env.Environment === "Sandbox" ? process.env.STRIPE_SK_TEST : process.env.STRIPE_SK_PRODUCTION;
    console.log("Key is ", key)
    const stripe = StripeSdk(key);


    try {

        let alreadyCustomer = await findCustomer(user)
        
        if (alreadyCustomer.data.length === 1) {
            console.log("Already found ", alreadyCustomer)
            return alreadyCustomer.data[0]
        }
        else {
            const customer = await stripe.customers.create({
                name: user.first_name,
                email: user.email,
                metadata: { id: user.id }
            });
            console.log("Customer New ", customer)
            return customer
        }


        // return customer
    }
    catch (error) {
        console.log(error)
        return null
    }
}

export const findCustomer = async (user) => {

    let key = process.env.Environment === "Sandbox" ? process.env.STRIPE_SK_TEST : process.env.STRIPE_SK_PRODUCTION;
    console.log("Key is ", key)
    const stripe = StripeSdk(key);
    try {
        // const customer = await stripe.customers.search({
        //     query: `email: '${user.email}'`
        // }); 

        const customer = await stripe.customers.search({
            query: `metadata['id']:'${user.id}'`
        });

        return customer
    }
    catch (error) {
        console.log(error)
        return null
    }
}


export const createCard = async (user, token) => {

    let key = process.env.Environment === "Sandbox" ? process.env.STRIPE_SK_TEST : process.env.STRIPE_SK_PRODUCTION;
    console.log("Key is ", key)
    const stripe = StripeSdk(key);

    try {
        let customer = await createCustomer(user);

        const customerSource = await stripe.customers.createSource(
            customer.id,
            {
                source: token,
            }
        );

        return customerSource
    }
    catch (error) {
        console.log(error)
        return null
    }
}

export const createSubscription = async (user, subscription) => {

    let key = process.env.Environment === "Sandbox" ? process.env.STRIPE_SK_TEST : process.env.STRIPE_SK_PRODUCTION;
    console.log("Subscription in stripe.js ", subscription)

    try {
        const stripe = StripeSdk(key);
        let customer = await createCustomer(user);
        const sub = await stripe.subscriptions.create({
            customer: customer.id,
            items: [
                {
                    price: subscription.id,
                },
            ],
        });
        console.log("##############")
        console.log("Subscribed ", sub)
        console.log("##############")
        return { data: sub, status: true, message: "User subscribed" };
    }
    catch (error) {
        console.log(error)
        return { data: error, status: false, message: error };
    }
}

export const cancelSubscription = async (user, subscription) => {

    let key = process.env.Environment === "Sandbox" ? process.env.STRIPE_SK_TEST : process.env.STRIPE_SK_PRODUCTION;
    console.log("Subscription in stripe.js ", subscription)

    try {
        const stripe = StripeSdk(key);
        let customer = await createCustomer(user);
        let subid = subscription.subid;

        const sub = await stripe.subscriptions.cancel(
            subid
          );
        // let subs = await GetActiveSubscriptions(user)
        
        
        return { data: sub, status: true, message: "Subscription cancelled" };
    }
    catch (error) {
        console.log(error)
        return { data: error, status: false, message: error };
    }
}


// export const resumeSubscription = async (user, subscription) => {

//     let key = process.env.Environment === "Sandbox" ? process.env.STRIPE_SK_TEST : process.env.STRIPE_SK_PRODUCTION;
//     console.log("Subscription in stripe.js ", subscription)

//     try {
//         const stripe = StripeSdk(key);
//         let customer = await createCustomer(user);
//         let subid = subscription.subid;

//         const sub = await stripe.subscriptions.resume(
//             subid
//           );
//         // let subs = await GetActiveSubscriptions(user)
        
        
//         return { data: sub, status: true, message: "Subscription cancelled" };
//     }
//     catch (error) {
//         console.log(error)
//         return { data: error, status: false, message: error };
//     }
// }


export const RetrieveASubscriptions = async (subid) => {
console.log("Retrieving ", subid)
    let key = process.env.Environment === "Sandbox" ? process.env.STRIPE_SK_TEST : process.env.STRIPE_SK_PRODUCTION;
    // console.log("Subscription in stripe.js ", subscription)

    try {
        const stripe = StripeSdk(key);
        const sub = await stripe.subscriptions.retrieve(
            subid
          );
        return sub
    }
    catch (error) {
        console.log(error)
        return null
    }
}


export const GetActiveSubscriptions = async (user) => {

    let key = process.env.Environment === "Sandbox" ? process.env.STRIPE_SK_TEST : process.env.STRIPE_SK_PRODUCTION;
    // console.log("Subscription in stripe.js ", subscription)

    try {
        const stripe = StripeSdk(key);
        let customer = await createCustomer(user);
        const sub = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active'
        });
        // console.log("##############")
        // console.log("Subscriptions for user  ", user.first_name)
        // console.log("##############")
        return sub
    }
    catch (error) {
        console.log(error)
        return null
    }
}



// export const deleteCard = async (user, token) => {

//     let key = process.env.Environment === "Sandbox" ? process.env.STRIPE_SK_TEST : process.env.STRIPE_SK_PRODUCTION;
//     console.log("Key is ", key)
//     const stripe = StripeSdk(key);

//     try {
//         let customer = await createCustomer(user);

//         const customerSource = await stripe.customers.deleteSource(
//             customer.id,
//             {
//                 source: token,
//             }
//         );

//         return customerSource
//     }
//     catch (error) {
//         console.log(error)
//         return null
//     }
// }

export const loadCards = async (user) => {
    let key = process.env.Environment === "Sandbox" ? process.env.STRIPE_SK_TEST : process.env.STRIPE_SK_PRODUCTION;
    console.log("Key is ", key)
    const stripe = StripeSdk(key);

    try {
        let customer = await createCustomer(user);


        let data = qs.stringify({
            'limit': '10'
        });

        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://api.stripe.com/v1/customers/${customer.id}/cards?limit=3`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${key}`
            },
            data: data
        };

        let response = await axios.request(config);
        if (response) {
            console.log("Load cards request");
            console.log(JSON.stringify(response.data.data));
            return response.data.data;
        }
        else {
            console.log("Load cards request errored");
            console.log(error);
            return null
        };
    }
    catch (error) {
        console.log("Load cards request errored out");
        console.log(error)
        return null
    }


}