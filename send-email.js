/*
 * NODEMAILER - SEND EMAIL VIA SMTP (tested with live.com account) 
 + COMPATBLE NETLIFY-LAMBDA! (AWS LAMBDA?)
 * Author MANUEL TREBBI 
 */

//const querystring = require('querystring');
"use strict";
const nodemailer = require("nodemailer");
var jwt = require("jsonwebtoken");

const { SMTP_HOST } = process.env;
const { SMTP_PORT } = process.env;
const { SMTP_USER } = process.env;
const { SMTP_PASS } = process.env;
const { NETLIFY_DEV } = process.env;
const { AUTH_PRIVATE_KEY } = process.env;

let headersOptions = {};
if (NETLIFY_DEV === "true") {
  headersOptions = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Origin, X-Requested-With, Content-Type, Accept",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Credentials": "true"
  };
}

//EMAIL STATUS
let status = false;
let paramsIsValid = true;

exports.handler = async (event, context) => {
  let emailDetails,
    bodyContent = {};
  let nodemailLoggerEnabled = false;

  try {
    //IN CASE THE METHOD IS NOT "POST"
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: "Method Not Allowed",
        headers: headersOptions
      };
    }

    //PARSE HTTP POST
    const params = JSON.parse(event.body);

    //FROM HTTP POST
    const token = params.token;
    const emailSubject = params.subject;
    const fromEmail = params.from;
    const emailText = params.text;
    const emailHtml = params.text;

    var decoded;
    try {
      decoded = jwt.verify(token, AUTH_PRIVATE_KEY);
    } catch (err) {}

    //FAIL AUTH
    if (!(decoded && decoded.auth && decoded.auth == "email")) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Auth failed" }),
        headers: headersOptions
      };
    }

    if (!emailSubject || emailSubject.length <= 0) {
      paramsIsValid = false;
    }

    if (!emailText || emailText.length <= 0) {
      paramsIsValid = false;
    }

    if (!emailHtml || emailHtml.length <= 0) {
      paramsIsValid = false;
    }

    if (!fromEmail || fromEmail.length <= 0 || fromEmail.indexOf("@") === -1) {
      paramsIsValid = false;
    }

    if (paramsIsValid === true) {
      async function main() {
        // create reusable transporter object using the default SMTP transport

        if (NETLIFY_DEV === "true") {
          nodemailLoggerEnabled = true;
        }

        const transport = {
          secureConnection: false,
          host: SMTP_HOST,
          port: SMTP_PORT,
          logger: nodemailLoggerEnabled,
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
          },
          tls: {
            ciphers: "SSLv3"
          }
        };

        //OUTPUT IN CONSOLE THE CONNECTON DATA
        if (NETLIFY_DEV === "true") {
          console.log(transport);
        }

        let transporter = nodemailer.createTransport(transport);

        const myEmailText =
          "Messaggio inviato da: " +
          emailSubject +
          "\n\nTesto del messaggio:\n" +
          emailText;
        const myEmailHtml =
          "<b>Messaggio inviato da</b>: " +
          emailSubject +
          "<br><br><b>Testo del messaggio:</b><br>" +
          emailText;

        //TEST CONNECTION TO SMTP
        if (NETLIFY_DEV === "true") {
          transporter.verify(function(error, success) {
            if (error) {
              console.log(error);
            } else {
              console.log("Server is ready to take our messages");
            }
          });
        }

        //EMAIL OBJECT
        const email = {
          from: "Manuel-Portfolio <" + SMTP_USER + ">", // sender address
          to: "Manuel Trebbi <" + process.env.DEFAULT_EMAIL_RECEIVER + ">", // list of receivers
          subject: emailSubject,
          text: myEmailText,
          html: myEmailHtml
        };

        if (NETLIFY_DEV === "true") {
          console.log(email);
        }

        //SEND EMAIL
        return await transporter.sendMail(email);
      }

      await main()
        .then(data => {
          emailDetails = data;
          status = true;
        })
        .catch(e => {
          console.error(e);
          status = false;
        });
    } else {
      //KO - BAD REQUEST
      return { statusCode: 400, body: "Bad request", headers: headersOptions };
    }

    if (NETLIFY_DEV === "true") {
      bodyContent = JSON.stringify({
        emailStatus: status,
        paramsValidation: paramsIsValid,
        details: emailDetails
      });
    } else {
      bodyContent = JSON.stringify({
        emailStatus: status,
        paramsValidation: paramsIsValid
      });
    }

    //OK
    return { statusCode: 200, body: bodyContent, headers: headersOptions };
  } catch (err) {
    //ALL IS GONE
    return { statusCode: 500, body: err.toString(), headers: headersOptions };
  }
};
