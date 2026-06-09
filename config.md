In a few simple steps, we will explain how to send an SMS using MiMSMS HTTP API.

Firstly, you’ll need a valid MiMSMS account. When you sign up for the account, your email address will set as your username

and the API Key can be generated from your Developer Option of MiM SMS Portal.

Authorization Section:
The message will be sent only to a valid phone number (numbers), written in international format e.g.8801844909020. We strongly recommend using the international format without + (plus sign), followed by a country code, network code and the subscriber number. Phone numbers that are not recommend formatted may not work properly.

Now, you are ready to send your first SMS message using:

POST https://api.mimsms.com/api/SmsSending/SMS

The request body contains the message you wish to send with from, to and text parameters. Full JSON request is shown below:

{
"UserName": " you@example.com ",
"Apikey": " XXXXXXXXXXXXXXXXXXXXXX",
"MobileNumber": "88018xxxxxxxx",
"CampaignId": "null",
"SenderName": "MiM Digital",
"TransactionType": "T",
"Message": " My first API SMS from MiM Digital"
}

Send SMS (JSON Format)
After the “Send SMS” HTTP request was submitted to the MiMSMS SMS API, you will get a response containing some useful information. If everything went well, it should provide a 200 OK response with message details in the response body.

Here is an example of a request for sending a single SMS:

POST /api/SmsSending/SMS
Host: api.mimsms.com
Content-Type: application/json
Accept: application/json

{
"UserName": " you@example.com ",
"Apikey": " XXXXXXXXXXXXXXXXXXXXXX",
"MobileNumber": "88018xxxxxxxx",
"CampaignId": "null",
"SenderName": "MiM SMS",
"TransactionType": "T",
"Message": " My first API SMS from MiM Digital"
}
And the appropriate response is shown below:

{
"statusCode": "200",
"status": "Success",
"trxnId": "1OSY3FSZ7H4IHOU",
"responseResult": "SMS Send Successfuly"
}

Multiple numbers can be separated by a comma only for promotional SMS.
Sending promotional messages must require prior approval from the regulatory.
Each message successfully submitted to the MiMSMS platform is uniquely identified with the trxnId. Furthermore, the Transaction ID can be used for checking delivery status or sent message logs.
status is the object that further describes the state of sent message. For a full list of available statuses, please check.