import Pusher from "pusher";

const pusher = new Pusher({
  appId: "1813836",
  key: "404f727e86e2044ed1f4",
  secret: "870f8397ecaedc25ddb5",
  cluster: "us3",
  useTLS: true
});


export default pusher;