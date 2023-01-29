const express = require("express");
const app = express();
const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 50,
  message: '{status: "429", code: "Rate limit reached"}'
});

app.use(limiter);

/* Cronjob v0 */
require('./peta_cron')(app);

/* Grades Backend v0 */
require('./grades')(app);

/* Product v0 */
require('./product')(app);

/* Ingredients v0 */
require('./ingredients')(app);

/* Peta v0 */
require('./peta')(app);

/* Wildcard routing */
require('./errors')(app);

const port = 65535;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
