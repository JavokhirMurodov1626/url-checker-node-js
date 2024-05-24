const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // 1) Create a transporter
  let transport = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 2525,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  //activate in gmail "less secure app" option

  //2. Define the email options

  const mailOptions = {
    from: "Murodov Javohir <javohir@gmail.com>",
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  //3. Send the email
  await transport.sendMail(mailOptions);
};

module.exports = sendEmail;
