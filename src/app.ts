import express, { type Application } from 'express'
import bodyParser from 'body-parser'
import petaCron from './peta_cron'
import grades from './grades'
import product from './product'
import ingredients from './ingredients'
import peta from './peta'
import errors from './errors'
import rateLimit from 'express-rate-limit'
import pino from 'pino';
import pinoHttp from 'pino-http';

const logger = pino({ level: process.env.LOG_LEVEL || 'warn' });

const app: Application = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.json())
app.use(pinoHttp({ logger: logger }))

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: '{status: "429", code: "Rate limit reached"}'
})

app.use(limiter)

/* Cronjob v0 */
petaCron(app)

/* Grades Backend v0 */
grades(app)

/* Product v0 */
product(app)

/* Ingredients v0 */
ingredients(app)

/* Peta v0 */
peta(app)

/* Wildcard routing */
errors(app)

const port: number = 8080
app.listen(port, () => {
  logger.warn(`Server started on port ${port}`)
})
