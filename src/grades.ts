import express, { type Application, type Request, type Response } from 'express'
import request from 'request'
import nodemailer from 'nodemailer'
import pino from 'pino';
import dotenv from 'dotenv'
dotenv.config()

const logger = pino({ level: process.env.LOG_LEVEL || 'warn' });

export default function (app: Application): void {
  app.use(express.json())

  app.post('/v0/grades/backend', (req: Request, res: Response) => {
    const barcode: string = req.body.barcode
    if (
      !barcode ||
            isNaN(Number(barcode)) ||
            barcode.length < 8 ||
            barcode.length > 16 ||
            !/^\d+$/.test(barcode)
    ) {
      res.send('Error')
      return
    }

    const url: string = `https://grades.vegancheck.me/api/${barcode}.json`
    request.head(url, (err: any, response: request.Response) => {
      if (err) {
        res.send('Error')
        return
      }
      if (response.statusCode === 404) {
        // setup email data with unicode symbols
        const mailOptions: nodemailer.SendMailOptions = {
          from: '"VeganCheck" <grades@vegancheck.me>', // sender address
          to: 'philip@brembeck.me', // list of receivers
          subject: `VeganCheck Grade: ${barcode}`, // Subject line
          html: `This product has to be checked: <b>${barcode}</b>` // html body
        }

        const transporter: nodemailer.Transporter = nodemailer.createTransport({
          host: 'smtp.ionos.de',
          port: 587,
          secure: false,
          auth: {
            user: 'grades@vegancheck.me',
            pass: process.env.MAILPWD
          }
        })

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error: Error | null, info: nodemailer.SentMessageInfo) => {
          if (error != null) {
            logger.warn(error)
            res.send('Error')
          } else {
            logger.info('Message sent: %s', info.messageId)
            res.send('Sent')
          }
        })
      } else {
        request(url).pipe(res)
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
      }
    })
  })
}
